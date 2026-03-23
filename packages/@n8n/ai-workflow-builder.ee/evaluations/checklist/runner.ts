import { v4 as uuid } from 'uuid';
import { parse as parseFlatted } from 'flatted';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IDataObject, INodeTypeDescription } from 'n8n-workflow';

import { CodeWorkflowBuilder } from '../../src/code-builder/code-workflow-builder';
import type { TokenUsage } from '../../src/code-builder/types';
import type {
	StreamChunk,
	WorkflowUpdateChunk,
	ToolProgressChunk,
} from '../../src/types/streaming';

import { verifyChecklist } from './checklist';
import type {
	AgentResult,
	ChecklistItem,
	ExecutionAssertion,
	ExecutionAssertionResult,
	ExecutionData,
	ExecutionNodeInfo,
	ExecutionNodeOutput,
	ExecutionTest,
	Iteration,
	PromptConfig,
	ToolCallDetail,
} from './types';

function isWorkflowUpdateChunk(chunk: StreamChunk): chunk is WorkflowUpdateChunk {
	return chunk.type === 'workflow-updated';
}

function isToolProgressChunk(chunk: StreamChunk): chunk is ToolProgressChunk {
	return chunk.type === 'tool';
}

export interface RunnerConfig {
	nodeTypes: INodeTypeDescription[];
	nodeDefinitionDirs: string[];
	llm: BaseChatModel;
	timeoutMs?: number;
	verbose?: boolean;
	/** Execute the generated workflow via live n8n instance after generation */
	executeWorkflows?: boolean;
	/** Base URL for live n8n instance (default: http://localhost:5678) */
	n8nBaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Execution helpers
// ---------------------------------------------------------------------------

function checkExecutionAssertions(
	execution: ExecutionData,
	assertions: ExecutionAssertion[],
): ExecutionAssertionResult[] {
	return assertions.map((assertion) => {
		switch (assertion.type) {
			case 'succeeds':
				return {
					assertion,
					passed: execution.success,
					detail: execution.success
						? 'Execution succeeded'
						: `Failed: ${execution.error ?? 'unknown error'}`,
				};

			case 'minExecutedNodes':
				return {
					assertion,
					passed: execution.executedNodes.length >= assertion.min,
					detail: `${execution.executedNodes.length} nodes executed (min: ${assertion.min})`,
				};

			case 'outputMatches': {
				const regex = new RegExp(assertion.pattern, assertion.flags);
				let matched = false;
				let matchedNode = '';
				for (const [nodeName, info] of Object.entries(execution.nodeOutputs)) {
					for (const output of info.outputs) {
						const serialized = JSON.stringify(output.items);
						if (regex.test(serialized)) {
							matched = true;
							matchedNode = nodeName;
							break;
						}
					}
					if (matched) break;
				}
				return {
					assertion,
					passed: matched,
					detail: matched
						? `Pattern /${assertion.pattern}/${assertion.flags ?? ''} matched in "${matchedNode}"`
						: `Pattern /${assertion.pattern}/${assertion.flags ?? ''} not found in any node output`,
				};
			}

			case 'nodeTypeExecuted':
				// This requires node type info which we don't have in ExecutionData directly.
				// We'll check it from the workflow JSON in the caller.
				return {
					assertion,
					passed: false,
					detail: 'nodeTypeExecuted assertion not evaluated',
				};
		}
	});
}

// ---------------------------------------------------------------------------
// Live n8n execution (real engine via REST API)
// ---------------------------------------------------------------------------

let n8nSessionCookie: string | undefined;

async function n8nFetch(
	baseUrl: string,
	path: string,
	options: { method?: string; body?: unknown } = {},
): Promise<unknown> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (n8nSessionCookie) {
		headers.cookie = n8nSessionCookie;
	}
	const res = await fetch(`${baseUrl}${path}`, {
		method: options.method ?? 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`n8n API ${options.method ?? 'GET'} ${path} failed (${res.status}): ${text}`);
	}
	// Capture auth cookie from login response
	const setCookie = res.headers.get('set-cookie');
	if (setCookie) {
		const match = setCookie.match(/n8n-auth=[^;]+/);
		if (match) {
			n8nSessionCookie = match[0];
		}
	}
	return res.json() as Promise<unknown>;
}

async function ensureN8nSession(baseUrl: string): Promise<void> {
	if (n8nSessionCookie) return;
	// Login as owner with default dev credentials
	const email = process.env.N8N_EVAL_EMAIL ?? 'admin@n8n.io';
	const password = process.env.N8N_EVAL_PASSWORD ?? 'password';
	await n8nFetch(baseUrl, '/rest/login', {
		method: 'POST',
		body: { emailOrLdapLoginId: email, password },
	});
	if (!n8nSessionCookie) {
		throw new Error('Failed to authenticate with n8n — no session cookie received');
	}
}

async function executeLiveWorkflow(
	workflowJsonStr: string,
	verbose: boolean | undefined,
	executionTest: ExecutionTest | undefined,
	baseUrl: string,
): Promise<ExecutionData> {
	const startTime = Date.now();
	try {
		await ensureN8nSession(baseUrl);

		const workflowJson = JSON.parse(workflowJsonStr) as {
			nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
			connections: Record<string, unknown>;
			pinData?: Record<string, unknown>;
		};

		// Build pin data: start from workflow's own pin data, then override trigger if test input provided
		const pinData: Record<string, unknown> = {};
		if (workflowJson.pinData) {
			Object.assign(pinData, workflowJson.pinData);
		}

		// Find trigger node
		const triggerTypePrefixes = [
			'webhook',
			'formTrigger',
			'scheduleTrigger',
			'manualTrigger',
			'emailReadImap',
			'gmailTrigger',
		];
		const triggerNode = workflowJson.nodes.find((n) =>
			triggerTypePrefixes.some((t) => n.type.includes(t)),
		);

		if (executionTest?.input && triggerNode) {
			const isWebhookTrigger = triggerNode.type.includes('webhook');
			pinData[triggerNode.name] = executionTest.input.map((item) => ({
				json: isWebhookTrigger ? { headers: {}, params: {}, query: {}, body: item } : item,
			}));
		}

		// Inject pin data for Wait nodes
		for (const nd of workflowJson.nodes) {
			if (nd.type === 'n8n-nodes-base.wait' && !pinData[nd.name]) {
				pinData[nd.name] = [{ json: {} }];
			}
		}

		// Provision data tables referenced by the workflow
		const dataTableNodes = workflowJson.nodes.filter((n) => n.type === 'n8n-nodes-base.dataTable');
		const dataTableNames = new Set<string>();
		for (const dtNode of dataTableNodes) {
			const dtId = dtNode.parameters?.dataTableId as { value?: string } | string | undefined;
			const name = typeof dtId === 'string' ? dtId : dtId?.value;
			if (name) dataTableNames.add(name);
		}

		// Collect all column names referenced by data table nodes
		const tableColumnMap = new Map<string, Set<string>>();
		for (const dtNode of dataTableNodes) {
			const dtId = dtNode.parameters?.dataTableId as { value?: string } | string | undefined;
			const name = typeof dtId === 'string' ? dtId : dtId?.value;
			if (!name) continue;
			if (!tableColumnMap.has(name)) tableColumnMap.set(name, new Set());
			const cols = tableColumnMap.get(name)!;

			// Extract from columns.value (insert/upsert operations use flat object: { colName: "=expr", ... })
			const columnsParam = dtNode.parameters?.columns as
				| { value?: Record<string, unknown> }
				| undefined;
			if (columnsParam?.value && typeof columnsParam.value === 'object') {
				for (const key of Object.keys(columnsParam.value)) {
					if (key !== 'mappingMode') cols.add(key);
				}
			}

			// Extract from mappingColumns.values (alternative insert format)
			const mappingCols = dtNode.parameters?.mappingColumns as
				| { values?: Array<{ column?: string }> }
				| undefined;
			if (mappingCols?.values) {
				for (const v of mappingCols.values) {
					if (v.column) cols.add(v.column);
				}
			}

			// Extract from fieldValues.values (another alternative format)
			const fieldValues = dtNode.parameters?.fieldValues as
				| { values?: Array<{ column?: string; fieldName?: string }> }
				| undefined;
			if (fieldValues?.values) {
				for (const v of fieldValues.values) {
					if (v.column) cols.add(v.column);
					if (v.fieldName) cols.add(v.fieldName);
				}
			}

			// Extract from orderByColumn (get operations)
			const orderByCol = dtNode.parameters?.orderByColumn as string | undefined;
			if (orderByCol) cols.add(orderByCol);

			// Extract from filterByColumn (get/delete operations)
			const filterByCol = dtNode.parameters?.filterByColumn as string | undefined;
			if (filterByCol) cols.add(filterByCol);
		}

		// Also infer columns from test input data
		if (executionTest?.input) {
			for (const item of executionTest.input) {
				if (item && typeof item === 'object') {
					for (const key of Object.keys(item as Record<string, unknown>)) {
						// Add to all tables since we don't know which table the data goes to
						for (const cols of tableColumnMap.values()) {
							cols.add(key);
						}
					}
				}
			}
		}

		// Get personal project ID for data table creation
		let projectId: string | undefined;
		const createdTableIds: string[] = [];
		if (dataTableNames.size > 0) {
			const projRes = (await n8nFetch(baseUrl, '/rest/projects')) as {
				data: Array<{ id: string; type: string }>;
			};
			projectId = projRes.data.find((p) => p.type === 'personal')?.id;

			if (projectId) {
				for (const tableName of dataTableNames) {
					try {
						// Build columns from inferred names, fall back to generic defaults
						const inferredCols = tableColumnMap.get(tableName);
						const columns =
							inferredCols && inferredCols.size > 0
								? [...inferredCols].map((c) => ({ name: c, type: 'string' }))
								: [
										{ name: 'name', type: 'string' },
										{ name: 'email', type: 'string' },
										{ name: 'value', type: 'string' },
										{ name: 'status', type: 'string' },
									];

						const tableRes = (await n8nFetch(baseUrl, `/rest/projects/${projectId}/data-tables`, {
							method: 'POST',
							body: { name: tableName, columns },
						})) as { data: { id: string } };
						createdTableIds.push(tableRes.data.id);

						// Seed the table with test input data so queries return results
						if (executionTest?.input && executionTest.input.length > 0) {
							try {
								await n8nFetch(
									baseUrl,
									`/rest/projects/${projectId}/data-tables/${tableRes.data.id}/insert`,
									{
										method: 'POST',
										body: {
											data: executionTest.input,
											returnType: 'count',
										},
									},
								);
							} catch {
								// Seed failure is non-fatal
							}
						}

						// Patch workflow nodes to reference table by ID instead of name
						for (const dtNode of dataTableNodes) {
							const dtId = dtNode.parameters?.dataTableId as
								| { value?: string; __rl?: boolean; mode?: string }
								| undefined;
							if (dtId && dtId.value === tableName) {
								dtId.value = tableRes.data.id;
								dtId.mode = 'list';
							}
						}

						if (verbose) {
							console.log(`    Created data table "${tableName}" (${tableRes.data.id})`);
						}
					} catch {
						// Table may already exist, continue
					}
				}
			}
		}

		// Create workflow in n8n
		const createRes = (await n8nFetch(baseUrl, '/rest/workflows', {
			method: 'POST',
			body: {
				name: `eval-${Date.now()}`,
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				settings: { executionOrder: 'v1' },
				pinData,
			},
		})) as { data: { id: string; versionId: string } };

		const workflowId = createRes.data.id;

		try {
			// Execute the workflow
			const runRes = (await n8nFetch(baseUrl, `/rest/workflows/${workflowId}/run`, {
				method: 'POST',
				body: {
					triggerToStartFrom: triggerNode ? { name: triggerNode.name } : undefined,
				},
			})) as { data: { executionId: string } };

			const executionId = runRes.data.executionId;

			// Poll for completion
			interface ExecResponse {
				data: {
					status: string;
					data: string; // flatted-serialized JSON
				};
			}

			const pollTimeout = 30_000;
			const pollStart = Date.now();
			let execResult: ExecResponse;
			while (true) {
				execResult = (await n8nFetch(baseUrl, `/rest/executions/${executionId}`)) as ExecResponse;
				const status = execResult.data.status;
				if (status !== 'running' && status !== 'new') break;
				if (Date.now() - pollStart > pollTimeout) {
					throw new Error(`Execution ${executionId} timed out after ${pollTimeout}ms`);
				}
				await new Promise((r) => setTimeout(r, 500));
			}

			// Parse flatted execution data
			const execData = parseFlatted(execResult!.data.data) as {
				resultData: {
					runData: Record<
						string,
						Array<{
							data?: { main?: Array<Array<{ json: IDataObject }> | null> };
							error?: { message: string };
						}>
					>;
					error?: { message: string };
				};
			};

			// Extract results
			const runData = execData.resultData.runData;
			const executedNodes: string[] = Object.keys(runData);
			const nodeOutputs: Record<string, ExecutionNodeInfo> = {};

			for (const [nodeName, taskDataArr] of Object.entries(runData)) {
				const taskData = taskDataArr[0];
				if (!taskData) continue;
				const outputs: ExecutionNodeOutput[] = [];
				const mainOutputs = taskData.data?.main;
				if (mainOutputs) {
					for (let i = 0; i < mainOutputs.length; i++) {
						const items = mainOutputs[i];
						if (items && items.length > 0) {
							outputs.push({ items: items.map((item) => item.json), outputIndex: i });
						}
					}
				}
				const error = taskData.error?.message;
				if (outputs.length > 0 || error) {
					nodeOutputs[nodeName] = { outputs, error };
				}
			}

			const success = execResult!.data.status === 'success';
			const executionError = execData.resultData.error?.message;

			const executionData: ExecutionData = {
				success,
				error: executionError,
				executedNodes,
				nodeOutputs,
				durationMs: Date.now() - startTime,
			};

			if (executionTest?.assertions) {
				executionData.assertionResults = checkExecutionAssertions(
					executionData,
					executionTest.assertions,
				);
			}

			return executionData;
		} finally {
			// Clean up: delete the workflow and provisioned data tables
			try {
				await n8nFetch(baseUrl, `/rest/workflows/${workflowId}`, { method: 'DELETE' });
			} catch {
				// Ignore cleanup errors
			}
			for (const tableId of createdTableIds) {
				try {
					await n8nFetch(baseUrl, `/rest/projects/${projectId}/data-tables/${tableId}`, {
						method: 'DELETE',
					});
				} catch {
					// Ignore cleanup errors
				}
			}
		}
	} catch (error) {
		if (verbose) {
			console.error(
				`    Live execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		const executionData: ExecutionData = {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			executedNodes: [],
			nodeOutputs: {},
			durationMs: Date.now() - startTime,
		};

		if (executionTest?.assertions) {
			executionData.assertionResults = checkExecutionAssertions(
				executionData,
				executionTest.assertions,
			);
		}

		return executionData;
	}
}

export async function runSingleExample(
	config: RunnerConfig,
	prompt: PromptConfig,
	checklist: ChecklistItem[],
): Promise<AgentResult> {
	const startTime = Date.now();

	// Track token usage per LLM call
	const tokenSnapshots: TokenUsage[] = [];
	const toolCallsPerIteration: ToolCallDetail[][] = [];
	let currentToolCalls: ToolCallDetail[] = [];
	// Map toolCallId -> ToolCallDetail for merging running/completed/error chunks
	const toolCallById = new Map<string, ToolCallDetail>();

	// Timing metrics
	let timeToFirstIterationMs = 0;
	let timeToFirstValidWorkflowMs = 0;

	const builder = new CodeWorkflowBuilder({
		llm: config.llm,
		nodeTypes: config.nodeTypes,
		nodeDefinitionDirs: config.nodeDefinitionDirs,
		onTokenUsage: (usage: TokenUsage) => {
			if (tokenSnapshots.length === 0) {
				timeToFirstIterationMs = Date.now() - startTime;
			}
			tokenSnapshots.push(usage);
			// Each token usage callback = end of one LLM iteration
			// Capture accumulated tool calls for this iteration
			toolCallsPerIteration.push([...currentToolCalls]);
			currentToolCalls = [];
			toolCallById.clear();
		},
	});

	const payload = {
		id: `checklist-eval-${uuid()}`,
		featureFlags: { codeBuilder: true as const },
		message: prompt.text,
		workflowContext: {
			currentWorkflow: { id: `eval-${uuid()}`, nodes: [], connections: {} },
		},
	};

	let sourceCode = '';
	let workflowJson = '';
	let success = false;

	// Setup timeout
	const abortController = new AbortController();
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutMs = config.timeoutMs ?? 5 * 60 * 1000; // 5 min default

	if (timeoutMs > 0) {
		timeoutId = setTimeout(() => {
			abortController.abort(new Error(`Timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	}

	try {
		for await (const output of builder.chat(payload, 'checklist-eval', abortController.signal)) {
			for (const message of output.messages) {
				if (isToolProgressChunk(message)) {
					const toolCallId = message.toolCallId as string | undefined;
					const status = message.status;

					if (status === 'running') {
						const detail: ToolCallDetail = {
							name: message.toolName,
							status,
							args: message.args as Record<string, unknown> | undefined,
						};
						currentToolCalls.push(detail);
						if (toolCallId) toolCallById.set(toolCallId, detail);
					} else if (toolCallId && toolCallById.has(toolCallId)) {
						// Merge completed/error data into existing detail
						const existing = toolCallById.get(toolCallId)!;
						existing.status = status;
						if (status === 'completed') {
							existing.result = message.result as string | undefined;
						}
						if (status === 'error') {
							existing.error = message.error as string | undefined;
						}
					}
				}

				if (isWorkflowUpdateChunk(message)) {
					if (!success) {
						timeToFirstValidWorkflowMs = Date.now() - startTime;
					}
					workflowJson = message.codeSnippet ?? '';
					sourceCode = message.sourceCode ?? '';
					success = true;
				}
			}
		}
	} catch (error) {
		if (config.verbose) {
			console.error(
				`  Error running prompt: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	}

	const totalTimeMs = Date.now() - startTime;

	// Flush any remaining tool calls into the last iteration's bucket.
	// Tool calls from the final LLM response are processed after its onTokenUsage fires,
	// so they remain in currentToolCalls and need to be appended to the last iteration.
	if (currentToolCalls.length > 0 && toolCallsPerIteration.length > 0) {
		const last = toolCallsPerIteration[toolCallsPerIteration.length - 1];
		last.push(...currentToolCalls);
	}

	// Build iterations from token snapshots
	const iterations: Iteration[] = tokenSnapshots.map((snapshot, i) => ({
		iterationNumber: i + 1,
		durationMs: 0, // Individual iteration timing not available from token callback
		inputTokens: snapshot.inputTokens,
		outputTokens: snapshot.outputTokens,
		thinkingTokens: snapshot.thinkingTokens,
		toolCalls: toolCallsPerIteration[i] ?? [],
		errors: '',
	}));

	// Calculate totals
	const totalInputTokens = tokenSnapshots.reduce((sum, s) => sum + s.inputTokens, 0);
	const totalOutputTokens = tokenSnapshots.reduce((sum, s) => sum + s.outputTokens, 0);

	// Use sourceCode for verification; fall back to workflowJson if sourceCode is empty
	const codeForVerification = sourceCode || workflowJson;
	const linesOfCode = codeForVerification ? codeForVerification.split('\n').length : 0;

	// Verify checklist if we have code to verify
	let checklistResults = checklist.map((item) => ({
		id: item.id,
		pass: false,
		reasoning: 'No code generated',
	}));
	let checklistScore = 0;

	if (success && codeForVerification) {
		try {
			checklistResults = await verifyChecklist(codeForVerification, checklist);
			const passedCount = checklistResults.filter((r) => r.pass).length;
			checklistScore = checklist.length > 0 ? passedCount / checklist.length : 0;
		} catch (error) {
			if (config.verbose) {
				console.error(
					`  Checklist verification failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	// Execute generated workflow if enabled
	let execution: ExecutionData | undefined;
	if (config.executeWorkflows && success && workflowJson) {
		try {
			const baseUrl = config.n8nBaseUrl ?? 'http://localhost:5678';
			execution = await executeLiveWorkflow(
				workflowJson,
				config.verbose,
				prompt.executionTest,
				baseUrl,
			);
			if (config.verbose) {
				const execIcon = execution.success ? '\u2713' : '\u2717';
				console.log(
					`    ${execIcon} Execution: ${execution.executedNodes.length} nodes, ${execution.durationMs}ms${execution.error ? ` — ${execution.error.slice(0, 80)}` : ''}`,
				);
				if (execution.assertionResults) {
					for (const ar of execution.assertionResults) {
						const icon = ar.passed ? '\u2713' : '\u2717';
						const label =
							ar.assertion.type === 'outputMatches'
								? `outputMatches(/${ar.assertion.pattern}/)`
								: ar.assertion.type === 'minExecutedNodes'
									? `minExecutedNodes(${ar.assertion.min})`
									: ar.assertion.type;
						console.log(`      ${icon} ${label}${ar.detail ? ` — ${ar.detail}` : ''}`);
					}
				}
			}
		} catch (error) {
			if (config.verbose) {
				console.error(
					`    Execution error: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	return {
		prompt: prompt.text,
		complexity: prompt.complexity,
		tags: prompt.tags,
		generatedCode: sourceCode || workflowJson,
		workflowJson,
		success,
		totalTimeMs,
		timeToFirstIterationMs,
		timeToFirstValidWorkflowMs,
		iterations,
		checklist,
		checklistResults,
		checklistScore,
		totalInputTokens,
		totalOutputTokens,
		linesOfCode,
		execution,
	};
}
