import { v4 as uuid } from 'uuid';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type {
	IConnections,
	IDataObject,
	INode,
	INodeTypeDescription,
	IRunData,
} from 'n8n-workflow';

import { CodeWorkflowBuilder } from '../../src/code-builder/code-workflow-builder';
import type { TokenUsage } from '../../src/code-builder/types';
import type {
	StreamChunk,
	WorkflowUpdateChunk,
	ToolProgressChunk,
} from '../../src/types/streaming';

import {
	resolveImports,
	executeWorkflow,
	extractPinData,
	patchFilterConditions,
	// eslint-disable-next-line import/no-relative-packages
} from '../../../workflow-sdk/src/simplified-compiler/execution-utils';

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
	/** Use simplified JS syntax (onManual, http, Agent DSL) instead of SDK */
	useSimplifiedSyntax?: boolean;
	/** Execute the generated workflow after generation and checklist verification */
	executeWorkflows?: boolean;
	/** Execute via live n8n instance (real expression evaluation) instead of mock executor */
	executeLive?: boolean;
	/** Base URL for live n8n instance (default: http://localhost:5678) */
	n8nBaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Execution helpers
// ---------------------------------------------------------------------------

function extractNodeOutputs(runData?: IRunData): Record<string, ExecutionNodeInfo> {
	const result: Record<string, ExecutionNodeInfo> = {};
	if (!runData) return result;
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
			result[nodeName] = { outputs, error };
		}
	}
	return result;
}

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

async function executeGeneratedWorkflow(
	workflowJsonStr: string,
	verbose?: boolean,
	executionTest?: ExecutionTest,
): Promise<ExecutionData> {
	const startTime = Date.now();
	try {
		const workflowJson = JSON.parse(workflowJsonStr) as {
			nodes: INode[];
			connections: Record<string, unknown>;
			pinData?: Record<string, unknown>;
		};

		let pinData = extractPinData(workflowJson);

		patchFilterConditions(workflowJson.nodes as Array<{ parameters?: Record<string, unknown> }>);

		// Override trigger pin data with test input if provided
		if (executionTest?.input) {
			const triggerTypePrefixes = [
				'webhook',
				'formTrigger',
				'scheduleTrigger',
				'manualTrigger',
				'emailReadImap',
				'gmailTrigger',
			];
			const triggerNode = (workflowJson.nodes as Array<{ name: string; type: string }>).find((n) =>
				triggerTypePrefixes.some((t) => n.type.includes(t)),
			);
			if (triggerNode) {
				pinData[triggerNode.name] = executionTest.input.map((item) => ({
					json: item as IDataObject,
				}));
			}
		}

		// Inject pin data for Wait nodes
		for (const nd of workflowJson.nodes as Array<{ name: string; type: string }>) {
			if (nd.type === 'n8n-nodes-base.wait' && !pinData[nd.name]) {
				pinData[nd.name] = [{ json: {} }];
			}
		}

		const result = await executeWorkflow(
			{
				name: 'eval-workflow',
				nodes: workflowJson.nodes,
				connections: workflowJson.connections as unknown as IConnections,
			},
			pinData,
		);

		const nodeOutputs = extractNodeOutputs(result.run?.data?.resultData?.runData);

		// Merge sub-workflow outputs
		if (result.subWorkflowRuns) {
			for (const entry of result.subWorkflowRuns) {
				const subRunData = entry.run?.data?.resultData?.runData;
				if (subRunData) {
					Object.assign(nodeOutputs, extractNodeOutputs(subRunData));
				}
			}
		}

		const executionData: ExecutionData = {
			success: result.success,
			error: result.error,
			errorNode: result.errorNode,
			executedNodes: result.executedNodes,
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
	} catch (error) {
		if (verbose) {
			console.error(
				`    Execution failed: ${error instanceof Error ? error.message : String(error)}`,
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
		const match = setCookie.match(/n8n-auth-token=[^;]+/);
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
			pinData[triggerNode.name] = executionTest.input.map((item) => ({
				json: item,
			}));
		}

		// Inject pin data for Wait nodes
		for (const nd of workflowJson.nodes) {
			if (nd.type === 'n8n-nodes-base.wait' && !pinData[nd.name]) {
				pinData[nd.name] = [{ json: {} }];
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
			let execResult: {
				data: {
					status: string;
					data: {
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
				};
			};

			const pollTimeout = 30_000;
			const pollStart = Date.now();
			while (true) {
				execResult = (await n8nFetch(
					baseUrl,
					`/rest/executions/${executionId}`,
				)) as typeof execResult;
				const status = execResult.data.status;
				if (status !== 'running' && status !== 'new') break;
				if (Date.now() - pollStart > pollTimeout) {
					throw new Error(`Execution ${executionId} timed out after ${pollTimeout}ms`);
				}
				await new Promise((r) => setTimeout(r, 500));
			}

			// Extract results
			const runData = execResult!.data.data.resultData.runData;
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
			const executionError = execResult!.data.data.resultData.error?.message;

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
			// Clean up: delete the workflow
			try {
				await n8nFetch(baseUrl, `/rest/workflows/${workflowId}`, { method: 'DELETE' });
			} catch {
				// Ignore cleanup errors
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

let executionImportsResolved = false;

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
		useSimplifiedSyntax: config.useSimplifiedSyntax,
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
			if (config.executeLive) {
				const baseUrl = config.n8nBaseUrl ?? 'http://localhost:5678';
				execution = await executeLiveWorkflow(
					workflowJson,
					config.verbose,
					prompt.executionTest,
					baseUrl,
				);
			} else {
				if (!executionImportsResolved) {
					await resolveImports();
					executionImportsResolved = true;
				}
				execution = await executeGeneratedWorkflow(
					workflowJson,
					config.verbose,
					prompt.executionTest,
				);
			}
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
