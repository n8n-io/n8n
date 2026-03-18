// ---------------------------------------------------------------------------
// Post-run verification and artifact building
//
// After the instance-ai agent finishes a run, this module extracts the
// outcome from captured SSE events, queries the n8n REST API for full
// details, and builds a human-readable verification artifact that is
// sent to Claude for checklist evaluation.
// ---------------------------------------------------------------------------

import { parse as parseFlatted } from 'flatted';

import { EVAL_CREDENTIALS } from './credentials';
import type { N8nClient } from './n8n-client';
import type {
	AgentActivity,
	AgentOutcome,
	CapturedEvent,
	CapturedToolCall,
	ExecutionSummary,
	ExecutionTestInput,
	InstanceAiMetrics,
	NodeOutputData,
	PromptConfig,
	WorkflowSummary,
} from './types';

// ---------------------------------------------------------------------------
// Tool names whose results contain resource IDs we need to track
// ---------------------------------------------------------------------------

const WORKFLOW_TOOLS = new Set([
	'build-workflow',
	'submit-workflow',
	'patch-workflow',
	'build-workflow-with-agent',
]);

const EXECUTION_TOOL = 'run-workflow';
const DATA_TABLE_TOOL = 'create-data-table';

// ---------------------------------------------------------------------------
// Type guards for event payloads
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
	const value = obj[key];
	return typeof value === 'string' ? value : undefined;
}

function getRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
	const value = obj[key];
	return isRecord(value) ? value : undefined;
}

// ---------------------------------------------------------------------------
// extractOutcomeFromEvents
// ---------------------------------------------------------------------------

interface EventOutcome {
	workflowIds: string[];
	executionIds: string[];
	dataTableIds: string[];
	finalText: string;
	toolCalls: CapturedToolCall[];
	agentActivities: AgentActivity[];
}

export function extractOutcomeFromEvents(events: CapturedEvent[]): EventOutcome {
	const workflowIds: string[] = [];
	const executionIds: string[] = [];
	const dataTableIds: string[] = [];
	const textChunks: string[] = [];
	const toolCalls: CapturedToolCall[] = [];
	const agentActivities: AgentActivity[] = [];

	// Track in-progress tool calls by toolCallId for duration calculation
	const toolCallStarts = new Map<
		string,
		{ timestamp: number; toolName: string; args: Record<string, unknown> }
	>();

	// Track agent activities by agentId
	const agentMap = new Map<string, AgentActivity>();

	for (const event of events) {
		const { type, data } = event;

		switch (type) {
			case 'text-delta': {
				const text = getString(data, 'text') ?? getString(getRecord(data, 'payload') ?? {}, 'text');
				if (text) {
					textChunks.push(text);
				}
				break;
			}

			case 'tool-call': {
				const payload = getRecord(data, 'payload') ?? data;
				const toolName = getString(payload, 'toolName') ?? '';
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const argsRaw = getRecord(payload, 'args');

				toolCallStarts.set(toolCallId || `${event.timestamp}-${toolName}`, {
					timestamp: event.timestamp,
					toolName,
					args: argsRaw ?? {},
				});
				break;
			}

			case 'tool-result': {
				const payload = getRecord(data, 'payload') ?? data;
				const toolName = getString(payload, 'toolName') ?? '';
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const result = payload.result ?? data.result;

				const startEntry = toolCallStarts.get(toolCallId || `${event.timestamp}-${toolName}`);
				const durationMs = startEntry ? event.timestamp - startEntry.timestamp : 0;
				const args = startEntry?.args ?? {};

				const toolCall: CapturedToolCall = {
					toolCallId: toolCallId || `auto-${event.timestamp}`,
					toolName,
					args,
					result,
					durationMs,
				};
				toolCalls.push(toolCall);

				// Extract resource IDs from tool results
				extractResourceIds(toolName, result, workflowIds, executionIds, dataTableIds);
				break;
			}

			case 'tool-error': {
				const payload = getRecord(data, 'payload') ?? data;
				const toolName = getString(payload, 'toolName') ?? '';
				const toolCallId = getString(payload, 'toolCallId') ?? getString(data, 'toolCallId') ?? '';
				const errorMsg = getString(payload, 'error') ?? getString(data, 'error') ?? 'Unknown error';

				const startEntry = toolCallStarts.get(toolCallId || `${event.timestamp}-${toolName}`);
				const durationMs = startEntry ? event.timestamp - startEntry.timestamp : 0;
				const args = startEntry?.args ?? {};

				toolCalls.push({
					toolCallId: toolCallId || `auto-${event.timestamp}`,
					toolName,
					args,
					error: errorMsg,
					durationMs,
				});
				break;
			}

			case 'agent-spawned': {
				const payload = getRecord(data, 'payload') ?? data;
				const agentId = getString(data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const role = getString(payload, 'role') ?? '';
				const parentId = getString(payload, 'parentId');
				const toolsRaw = payload.tools;
				const tools = Array.isArray(toolsRaw)
					? (toolsRaw as unknown[]).filter((t): t is string => typeof t === 'string')
					: [];

				const activity: AgentActivity = {
					agentId,
					role,
					parentId,
					toolCalls: [],
					textContent: '',
					reasoning: '',
					status: 'running',
				};
				agentMap.set(agentId, activity);

				// Store tools info in reasoning for visibility
				if (tools.length > 0) {
					activity.reasoning = `Tools: ${tools.join(', ')}`;
				}
				break;
			}

			case 'agent-completed': {
				const payload = getRecord(data, 'payload') ?? data;
				const agentId = getString(data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const status = getString(payload, 'status') ?? 'completed';
				const resultText = getString(payload, 'result');

				const activity = agentMap.get(agentId);
				if (activity) {
					activity.status = status;
					if (resultText) {
						activity.textContent = resultText;
					}
				}
				break;
			}

			default:
				// Other event types (run-start, run-finish, confirmation-request, etc.)
				// are not directly needed for outcome extraction
				break;
		}
	}

	// Assign tool calls to their respective agents
	for (const tc of toolCalls) {
		// Find the matching event to get agentId
		const matchingEvent = events.find(
			(e) =>
				(e.type === 'tool-result' || e.type === 'tool-error') &&
				(getString(getRecord(e.data, 'payload') ?? e.data, 'toolCallId') === tc.toolCallId ||
					getString(e.data, 'toolCallId') === tc.toolCallId),
		);
		if (matchingEvent) {
			const agentId = getString(matchingEvent.data, 'agentId') ?? '';
			const activity = agentMap.get(agentId);
			if (activity) {
				activity.toolCalls.push(tc);
			}
		}
	}

	// Convert agent map to array
	for (const activity of agentMap.values()) {
		agentActivities.push(activity);
	}

	return {
		workflowIds: dedupe(workflowIds),
		executionIds: dedupe(executionIds),
		dataTableIds: dedupe(dataTableIds),
		finalText: textChunks.join(''),
		toolCalls,
		agentActivities,
	};
}

// ---------------------------------------------------------------------------
// snapshotWorkflowIds — call before the run to know what existed prior
// ---------------------------------------------------------------------------

export async function snapshotWorkflowIds(client: N8nClient): Promise<Set<string>> {
	try {
		const workflows = await client.listWorkflows();
		return new Set(workflows.map((wf) => wf.id));
	} catch {
		return new Set();
	}
}

// ---------------------------------------------------------------------------
// buildAgentOutcome
// ---------------------------------------------------------------------------

export async function buildAgentOutcome(
	client: N8nClient,
	eventOutcome: EventOutcome,
	preRunWorkflowIds?: Set<string>,
	claimedWorkflowIds?: Set<string>,
): Promise<AgentOutcome> {
	const workflowsCreated: WorkflowSummary[] = [];
	const workflowJsons: Record<string, unknown>[] = [];
	const executionsRun: ExecutionSummary[] = [];

	// Collect workflow IDs from events
	const knownWfIds = new Set(eventOutcome.workflowIds);

	// Mark event-based workflow IDs as claimed so concurrent runs skip them
	if (claimedWorkflowIds) {
		for (const id of knownWfIds) {
			claimedWorkflowIds.add(id);
		}
	}

	// Diff against pre-run snapshot to find workflows created by background tasks
	// that didn't surface in the SSE events we parsed.
	// When running concurrently, skip workflows already claimed by another run.
	if (preRunWorkflowIds) {
		try {
			const currentWorkflows = await client.listWorkflows();
			for (const wf of currentWorkflows) {
				if (
					!preRunWorkflowIds.has(wf.id) &&
					!knownWfIds.has(wf.id) &&
					(!claimedWorkflowIds || !claimedWorkflowIds.has(wf.id))
				) {
					knownWfIds.add(wf.id);
					claimedWorkflowIds?.add(wf.id);
				}
			}
		} catch {
			// Non-fatal — fall back to event-based IDs only
		}
	}

	// Fetch workflow details
	for (const wfId of knownWfIds) {
		try {
			const wf = await client.getWorkflow(wfId);
			const nodes = Array.isArray(wf.nodes) ? (wf.nodes as unknown[]) : [];
			workflowsCreated.push({
				id: wfId,
				name: typeof wf.name === 'string' ? wf.name : 'Unknown',
				nodeCount: nodes.length,
				active: typeof wf.active === 'boolean' ? wf.active : false,
			});
			workflowJsons.push(wf);
		} catch {
			// Workflow may have been deleted or is inaccessible
			workflowsCreated.push({
				id: wfId,
				name: '(fetch failed)',
				nodeCount: 0,
				active: false,
			});
		}
	}

	// Fetch execution details
	for (const execId of eventOutcome.executionIds) {
		try {
			const executions = await client.listExecutions();
			const match = executions.find((e) => e.id === execId);
			if (match) {
				executionsRun.push({
					id: match.id,
					workflowId: match.workflowId,
					status: match.status,
				});
			} else {
				executionsRun.push({
					id: execId,
					workflowId: 'unknown',
					status: 'not-found',
				});
			}
		} catch {
			executionsRun.push({
				id: execId,
				workflowId: 'unknown',
				status: 'fetch-failed',
			});
		}
	}

	return {
		workflowsCreated,
		executionsRun,
		dataTablesCreated: eventOutcome.dataTableIds,
		finalText: eventOutcome.finalText,
		workflowJsons,
	};
}

// ---------------------------------------------------------------------------
// buildMetrics
// ---------------------------------------------------------------------------

export function buildMetrics(events: CapturedEvent[], startTime: number): InstanceAiMetrics {
	let timeToFirstTextMs = 0;
	let timeToRunFinishMs = 0;
	let totalToolCalls = 0;
	let subAgentsSpawned = 0;
	let confirmationRequests = 0;
	const agentActivities: AgentActivity[] = [];

	const agentMap = new Map<string, AgentActivity>();
	let foundFirstText = false;

	for (const event of events) {
		const elapsed = event.timestamp - startTime;

		switch (event.type) {
			case 'text-delta': {
				if (!foundFirstText) {
					timeToFirstTextMs = elapsed;
					foundFirstText = true;
				}
				break;
			}

			case 'tool-call': {
				totalToolCalls++;
				break;
			}

			case 'agent-spawned': {
				subAgentsSpawned++;
				const payload = getRecord(event.data, 'payload') ?? event.data;
				const agentId = getString(event.data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const role = getString(payload, 'role') ?? '';
				const parentId = getString(payload, 'parentId');

				agentMap.set(agentId, {
					agentId,
					role,
					parentId,
					toolCalls: [],
					textContent: '',
					reasoning: '',
					status: 'running',
				});
				break;
			}

			case 'agent-completed': {
				const payload = getRecord(event.data, 'payload') ?? event.data;
				const agentId = getString(event.data, 'agentId') ?? getString(payload, 'agentId') ?? '';
				const status = getString(payload, 'status') ?? 'completed';
				const activity = agentMap.get(agentId);
				if (activity) {
					activity.status = status;
				}
				break;
			}

			case 'confirmation-request': {
				confirmationRequests++;
				break;
			}

			case 'run-finish': {
				timeToRunFinishMs = elapsed;
				break;
			}

			default:
				break;
		}
	}

	for (const activity of agentMap.values()) {
		agentActivities.push(activity);
	}

	const totalTimeMs = events.length > 0 ? events[events.length - 1].timestamp - startTime : 0;

	return {
		totalTimeMs,
		timeToFirstTextMs,
		timeToRunFinishMs,
		totalToolCalls,
		subAgentsSpawned,
		confirmationRequests,
		agentActivities,
		events,
	};
}

// ---------------------------------------------------------------------------
// buildVerificationArtifact
// ---------------------------------------------------------------------------

export function buildVerificationArtifact(
	outcome: AgentOutcome,
	toolCalls: CapturedToolCall[],
	agentActivities: AgentActivity[],
): string {
	const sections: string[] = [];

	// 1. Agent Text Response
	if (outcome.finalText.trim()) {
		sections.push(formatSection('Agent Text Response', outcome.finalText.trim()));
	}

	// 2. Created Workflows
	if (outcome.workflowsCreated.length > 0) {
		const workflowLines = outcome.workflowsCreated.map((wf) =>
			[
				`- Workflow "${wf.name}" (ID: ${wf.id})`,
				`  Nodes: ${String(wf.nodeCount)}`,
				`  Active: ${String(wf.active)}`,
			].join('\n'),
		);
		sections.push(formatSection('Created Workflows', workflowLines.join('\n\n')));
	}

	// 3. Execution Results
	if (outcome.executionsRun.length > 0) {
		const execLines = outcome.executionsRun.map((exec) => {
			const parts = [
				`- Execution ${exec.id || '(eval-triggered)'} (workflow: ${exec.workflowId}) — Status: ${exec.status}`,
			];
			if (exec.triggeredByEval) parts.push('  Triggered by: eval runner (post-build)');
			if (exec.error) parts.push(`  Error: ${exec.error}`);
			if (exec.failedNode) parts.push(`  Failed node: ${exec.failedNode}`);
			if (exec.outputData && exec.outputData.length > 0) {
				for (const nodeOutput of exec.outputData) {
					parts.push(`  Node "${nodeOutput.nodeName}" output:`);
					parts.push(`  \`\`\`json\n${JSON.stringify(nodeOutput.data, null, 2)}\n  \`\`\``);
				}
			}
			return parts.join('\n');
		});
		sections.push(formatSection('Execution Results', execLines.join('\n\n')));
	}

	// 4. Data Tables
	if (outcome.dataTablesCreated.length > 0) {
		const tableLines = outcome.dataTablesCreated.map((id) => `- Data table ID: ${id}`);
		sections.push(formatSection('Data Tables Created', tableLines.join('\n')));
	}

	// 5. Tool Calls Summary
	if (toolCalls.length > 0) {
		const toolLines = toolCalls.map((tc) => formatToolCall(tc));
		sections.push(formatSection('Tool Calls', toolLines.join('\n\n')));
	}

	// 6. Agent Activities
	if (agentActivities.length > 0) {
		const activityLines = agentActivities.map((activity) => formatAgentActivity(activity));
		sections.push(formatSection('Agent Activities', activityLines.join('\n\n')));
	}

	return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// Non-executable trigger types (cannot be force-executed in eval)
// ---------------------------------------------------------------------------

const NON_EXECUTABLE_TRIGGERS = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.formTrigger',
]);

const EXECUTION_POLL_INTERVAL_MS = 500;
const EXECUTION_POLL_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// runPostBuildExecutions
// ---------------------------------------------------------------------------

/**
 * Force-execute every created workflow that wasn't already executed.
 * Enriches existing execution summaries with error/failedNode details and output data.
 * When `testInputs` are provided, uses pin data to execute ALL trigger types
 * (including webhooks, forms, schedules) with the provided test data.
 * Mutates `outcome.executionsRun` in place.
 */
export async function runPostBuildExecutions(
	client: N8nClient,
	outcome: AgentOutcome,
	testInputs?: ExecutionTestInput[],
): Promise<void> {
	const alreadyExecutedWorkflowIds = new Set(outcome.executionsRun.map((e) => e.workflowId));

	// Enrich already-executed workflows with error/failedNode details + output data
	for (const exec of outcome.executionsRun) {
		if (exec.status === 'success' || exec.status === 'running') continue;
		try {
			const detail = await client.getExecution(exec.id);
			const { error, failedNode } = extractErrorFromExecution(detail.data);
			if (error) exec.error = error;
			if (failedNode) exec.failedNode = failedNode;
			exec.outputData = extractOutputFromExecution(detail.data);
		} catch {
			// Non-fatal — keep existing summary
		}
	}

	// Force-execute workflows that weren't run by the agent
	for (const wf of outcome.workflowsCreated) {
		if (alreadyExecutedWorkflowIds.has(wf.id)) continue;

		const triggerNode = findTriggerNode(outcome.workflowJsons, wf.id);

		// Check if we have a matching test input for this workflow's trigger type
		const matchingInput = testInputs
			? findMatchingTestInput(triggerNode?.type, testInputs)
			: undefined;

		// Skip non-executable triggers ONLY when no test inputs are available
		if (!matchingInput && triggerNode && NON_EXECUTABLE_TRIGGERS.has(triggerNode.type)) {
			outcome.executionsRun.push({
				id: '',
				workflowId: wf.id,
				status: 'skipped',
				triggeredByEval: true,
			});
			continue;
		}

		try {
			if (matchingInput && triggerNode) {
				// Use pin data to execute with test inputs
				const executionSummary = await executeWithPinData(
					client,
					wf.id,
					triggerNode.name,
					triggerNode.type,
					matchingInput,
				);
				outcome.executionsRun.push(executionSummary);
			} else {
				// Execute without pin data (existing behavior)
				const { executionId } = await client.executeWorkflow(wf.id, triggerNode?.name);
				const executionSummary = await pollExecution(client, executionId, wf.id);
				outcome.executionsRun.push(executionSummary);
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			outcome.executionsRun.push({
				id: '',
				workflowId: wf.id,
				status: 'error',
				error: errorMessage,
				triggeredByEval: true,
			});
		}
	}
}

// ---------------------------------------------------------------------------
// Pin data execution helpers
// ---------------------------------------------------------------------------

/** Map n8n node type to ExecutionTestInput.triggerType */
function nodeTypeToTriggerType(nodeType: string): ExecutionTestInput['triggerType'] | undefined {
	if (nodeType.includes('webhook') || nodeType === 'n8n-nodes-base.webhook') return 'webhook';
	if (nodeType.includes('formTrigger') || nodeType === 'n8n-nodes-base.formTrigger') return 'form';
	if (nodeType.includes('manualTrigger') || nodeType === 'n8n-nodes-base.manualTrigger')
		return 'manual';
	if (nodeType.includes('scheduleTrigger') || nodeType === 'n8n-nodes-base.scheduleTrigger')
		return 'schedule';
	// Also handle cron trigger
	if (nodeType.includes('cron') || nodeType.includes('Cron')) return 'schedule';
	return undefined;
}

function findMatchingTestInput(
	nodeType: string | undefined,
	testInputs: ExecutionTestInput[],
): ExecutionTestInput | undefined {
	if (!nodeType || testInputs.length === 0) return undefined;
	const triggerType = nodeTypeToTriggerType(nodeType);
	if (!triggerType) return undefined;
	return testInputs.find((input) => input.triggerType === triggerType);
}

/** Build pin data for a trigger node based on trigger type and test input */
function buildPinData(
	triggerNodeName: string,
	triggerNodeType: string,
	testInput: ExecutionTestInput,
): Record<string, unknown> {
	const triggerType = nodeTypeToTriggerType(triggerNodeType) ?? testInput.triggerType;

	switch (triggerType) {
		case 'webhook':
			return {
				[triggerNodeName]: [{ json: { headers: {}, query: {}, body: testInput.testData } }],
			};
		case 'form':
			return {
				[triggerNodeName]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'eval',
							...testInput.testData,
						},
					},
				],
			};
		case 'schedule':
			return {
				[triggerNodeName]: [
					{ json: { timestamp: new Date().toISOString(), ...testInput.testData } },
				],
			};
		case 'manual':
		default:
			return {
				[triggerNodeName]: [{ json: testInput.testData }],
			};
	}
}

/**
 * Execute a workflow using pin data on the trigger node.
 * Sets pin data → executes → polls → captures output → restores pin data.
 */
async function executeWithPinData(
	client: N8nClient,
	workflowId: string,
	triggerNodeName: string,
	triggerNodeType: string,
	testInput: ExecutionTestInput,
): Promise<ExecutionSummary> {
	// Save original workflow to restore pin data later
	const originalWorkflow = await client.getWorkflow(workflowId);
	const originalPinData = originalWorkflow.pinData ?? null;

	const pinData = buildPinData(triggerNodeName, triggerNodeType, testInput);

	try {
		// Set pin data on the workflow
		await client.updateWorkflow(workflowId, { pinData });

		// Execute with triggerToStartFrom
		const { executionId } = await client.executeWorkflow(workflowId, triggerNodeName);

		// Poll for completion and extract output
		return await pollExecution(client, executionId, workflowId);
	} finally {
		// Restore original pin data (best-effort)
		try {
			await client.updateWorkflow(workflowId, {
				pinData: originalPinData ?? {},
			});
		} catch {
			// Non-fatal — pin data restoration failure
		}
	}
}

async function pollExecution(
	client: N8nClient,
	executionId: string,
	workflowId: string,
): Promise<ExecutionSummary> {
	const deadline = Date.now() + EXECUTION_POLL_TIMEOUT_MS;

	while (Date.now() < deadline) {
		try {
			const detail = await client.getExecution(executionId);
			if (detail.status !== 'running' && detail.status !== 'new') {
				const { error, failedNode } = extractErrorFromExecution(detail.data);
				const outputData = extractOutputFromExecution(detail.data);
				return {
					id: executionId,
					workflowId,
					status: detail.status,
					error,
					failedNode,
					triggeredByEval: true,
					outputData,
				};
			}
		} catch {
			// Retry on transient errors
		}
		await new Promise((resolve) => setTimeout(resolve, EXECUTION_POLL_INTERVAL_MS));
	}

	return {
		id: executionId,
		workflowId,
		status: 'timeout',
		error: `Execution did not complete within ${String(EXECUTION_POLL_TIMEOUT_MS)}ms`,
		triggeredByEval: true,
	};
}

function findTriggerNode(
	workflowJsons: Record<string, unknown>[],
	workflowId: string,
): { name: string; type: string } | undefined {
	const wfJson = workflowJsons.find((wf) => typeof wf.id === 'string' && wf.id === workflowId);
	if (!wfJson || !Array.isArray(wfJson.nodes)) return undefined;

	const nodes = wfJson.nodes as Array<Record<string, unknown>>;

	// Find the first trigger node (type contains "trigger" or "Trigger", or is a webhook/schedule)
	return nodes
		.filter(
			(n): n is Record<string, unknown> & { name: string; type: string } =>
				typeof n.name === 'string' && typeof n.type === 'string',
		)
		.find(
			(n) =>
				n.type.toLowerCase().includes('trigger') ||
				n.type === 'n8n-nodes-base.webhook' ||
				n.type === 'n8n-nodes-base.manualTrigger',
		);
}

interface FlatExecRunEntry {
	data?: {
		main?: Array<Array<{ json: Record<string, unknown> }> | null>;
	};
}

interface FlatExecResultData {
	resultData?: {
		error?: { message?: string };
		lastNodeExecuted?: string;
		runData?: Record<string, FlatExecRunEntry[]>;
	};
}

function extractErrorFromExecution(flattedData: string): { error?: string; failedNode?: string } {
	if (!flattedData) return {};

	try {
		const parsed = parseFlatted(flattedData) as FlatExecResultData;
		const resultData = parsed?.resultData;
		if (!resultData) return {};

		return {
			error: resultData.error?.message,
			failedNode: resultData.lastNodeExecuted,
		};
	} catch {
		return {};
	}
}

const MAX_NODE_OUTPUT_CHARS = 5000;

function extractOutputFromExecution(flattedData: string): NodeOutputData[] {
	if (!flattedData) return [];

	try {
		const parsed = parseFlatted(flattedData) as FlatExecResultData;
		const runData = parsed?.resultData?.runData;
		if (!runData) return [];

		const outputs: NodeOutputData[] = [];

		for (const [nodeName, taskDataArray] of Object.entries(runData)) {
			if (!Array.isArray(taskDataArray) || taskDataArray.length === 0) continue;

			const firstRun = taskDataArray[0];
			const mainOutput = firstRun?.data?.main;
			if (!Array.isArray(mainOutput) || mainOutput.length === 0) continue;

			const firstConnection = mainOutput[0];
			if (!Array.isArray(firstConnection) || firstConnection.length === 0) continue;

			const items = firstConnection
				.filter((item): item is { json: Record<string, unknown> } => item?.json !== undefined)
				.map((item) => item.json);

			if (items.length === 0) continue;

			// Truncate large outputs to keep the artifact manageable
			const jsonStr = JSON.stringify(items);
			if (jsonStr.length > MAX_NODE_OUTPUT_CHARS) {
				outputs.push({
					nodeName,
					data: [{ _truncated: true, _preview: jsonStr.slice(0, MAX_NODE_OUTPUT_CHARS) }],
				});
			} else {
				outputs.push({ nodeName, data: items });
			}
		}

		return outputs;
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// cleanupEvalArtifacts
// ---------------------------------------------------------------------------

export async function cleanupEvalArtifacts(
	client: N8nClient,
	outcome: AgentOutcome,
): Promise<void> {
	for (const wf of outcome.workflowsCreated) {
		try {
			await client.deleteWorkflow(wf.id);
		} catch {
			// Best-effort cleanup — ignore failures
		}
	}
}

// ---------------------------------------------------------------------------
// Credential preflight, seeding, and cleanup
// ---------------------------------------------------------------------------

/**
 * Verify the n8n instance can create/delete credentials.
 * Catches missing encryption key or misconfigured instance early.
 */
export async function verifyCredentialSupport(client: N8nClient): Promise<void> {
	try {
		const { id } = await client.createCredential('eval-preflight-check', 'httpBasicAuth', {
			user: 'test',
			password: 'test',
		});
		await client.deleteCredential(id);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(
			'Credential preflight failed — n8n cannot create credentials. ' +
				'Ensure N8N_ENCRYPTION_KEY is set and the instance is configured. ' +
				`Details: ${msg}`,
		);
	}
}

/**
 * Seed only the credentials required by the selected prompts.
 * Returns IDs of created credentials for later cleanup.
 */
export async function seedEvalCredentials(
	client: N8nClient,
	prompts: PromptConfig[],
): Promise<string[]> {
	const neededTypes = new Set(prompts.flatMap((p) => p.requiredCredentials ?? []));
	if (neededTypes.size === 0) return [];

	const createdIds: string[] = [];
	for (const cred of EVAL_CREDENTIALS) {
		if (!neededTypes.has(cred.type)) continue;
		try {
			const { id } = await client.createCredential(cred.name, cred.type, cred.data);
			createdIds.push(id);
		} catch {
			// Non-fatal — credential type may not exist on this n8n version
		}
	}
	return createdIds;
}

/**
 * Best-effort cleanup of seeded credentials after eval run.
 */
export async function cleanupEvalCredentials(
	client: N8nClient,
	credentialIds: string[],
): Promise<void> {
	for (const id of credentialIds) {
		try {
			await client.deleteCredential(id);
		} catch {
			// Best-effort cleanup
		}
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractResourceIds(
	toolName: string,
	result: unknown,
	workflowIds: string[],
	executionIds: string[],
	dataTableIds: string[],
): void {
	if (WORKFLOW_TOOLS.has(toolName)) {
		const id = extractIdFromResult(result, 'workflowId', 'id');
		if (id) workflowIds.push(id);
	}

	if (toolName === EXECUTION_TOOL) {
		const id = extractIdFromResult(result, 'executionId', 'id');
		if (id) executionIds.push(id);
	}

	if (toolName === DATA_TABLE_TOOL) {
		const id = extractIdFromResult(result, 'dataTableId', 'id');
		if (id) dataTableIds.push(id);
	}
}

function extractIdFromResult(result: unknown, ...keys: string[]): string | undefined {
	if (!isRecord(result)) {
		// Result might be a stringified JSON
		if (typeof result === 'string') {
			try {
				const parsed: unknown = JSON.parse(result);
				if (isRecord(parsed)) {
					return extractIdFromRecord(parsed, keys);
				}
			} catch {
				return undefined;
			}
		}
		return undefined;
	}
	return extractIdFromRecord(result, keys);
}

function extractIdFromRecord(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
		// Some APIs return numeric IDs
		if (typeof value === 'number') {
			return String(value);
		}
	}
	return undefined;
}

function dedupe(arr: string[]): string[] {
	return [...new Set(arr)];
}

function formatSection(title: string, content: string): string {
	return `### ${title}\n\n${content}`;
}

function formatToolCall(tc: CapturedToolCall): string {
	const lines = [`**${tc.toolName}** (${String(tc.durationMs)}ms)`];

	const argsStr = JSON.stringify(tc.args, null, 2);
	if (argsStr !== '{}') {
		lines.push(`Args:\n\`\`\`json\n${argsStr}\n\`\`\``);
	}

	if (tc.error) {
		lines.push(`Error: ${tc.error}`);
	} else if (tc.result !== undefined) {
		const resultStr =
			typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2);
		// Truncate very large results to keep the artifact readable
		const truncated =
			resultStr.length > 2000 ? resultStr.slice(0, 2000) + '\n... (truncated)' : resultStr;
		lines.push(`Result:\n\`\`\`\n${truncated}\n\`\`\``);
	}

	return lines.join('\n');
}

function formatAgentActivity(activity: AgentActivity): string {
	const lines = [
		`**Agent ${activity.agentId}** (role: ${activity.role}, status: ${activity.status})`,
	];

	if (activity.parentId) {
		lines.push(`Parent: ${activity.parentId}`);
	}

	if (activity.reasoning) {
		lines.push(`Reasoning: ${activity.reasoning}`);
	}

	if (activity.toolCalls.length > 0) {
		const toolNames = activity.toolCalls.map((tc) => tc.toolName).join(', ');
		lines.push(`Tool calls: ${toolNames}`);
	}

	if (activity.textContent) {
		const truncated =
			activity.textContent.length > 500
				? activity.textContent.slice(0, 500) + '... (truncated)'
				: activity.textContent;
		lines.push(`Output: ${truncated}`);
	}

	return lines.join('\n');
}
