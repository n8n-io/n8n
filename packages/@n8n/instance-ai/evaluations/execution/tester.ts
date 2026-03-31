// ---------------------------------------------------------------------------
// Post-build execution testing
//
// After the instance-ai agent finishes building workflows, this module
// force-executes them to verify they run without errors. It handles:
//
// - Pin data injection for manual / schedule / form triggers
// - Webhook execution via activate -> HTTP call -> deactivate
// - Execution polling with 30s timeout
// - Error and output extraction from flatted execution data
// ---------------------------------------------------------------------------

import { parse as parseFlatted } from 'flatted';

import type { N8nClient, WorkflowNodeResponse, WorkflowResponse } from '../clients/n8n-client';
import type {
	AgentOutcome,
	ExecutionSummary,
	ExecutionTestInput,
	NodeOutputData,
	PinData,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NON_EXECUTABLE_TRIGGERS = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.formTrigger']);

const EXECUTION_POLL_INTERVAL_MS = 500;
const EXECUTION_POLL_TIMEOUT_MS = 30_000;
const MAX_NODE_OUTPUT_CHARS = 5000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Force-execute every created workflow that wasn't already executed.
 * Enriches existing execution summaries with error/failedNode details and
 * output data.
 *
 * When `testInputs` are provided:
 * - Webhook triggers: activates workflow and calls the live webhook URL
 * - Other triggers: uses pin data to inject test data
 *
 * When `servicePinData` is provided, it is merged with trigger pin data
 * so service nodes (Slack, Gmail, etc.) get realistic mock data while
 * internal logic nodes (Merge, IF, Set) execute for real.
 *
 * Mutates `outcome.executionsRun` in place.
 */
export async function runPostBuildExecutions(
	client: N8nClient,
	outcome: AgentOutcome,
	testInputs?: ExecutionTestInput[],
	servicePinData?: PinData,
): Promise<void> {
	// Exclude skipped executions so they can be re-executed with test inputs
	const alreadyExecutedWorkflowIds = new Set(
		outcome.executionsRun.filter((e) => e.status !== 'skipped').map((e) => e.workflowId),
	);

	// Enrich already-executed workflows with error/failedNode/outputData details
	for (const exec of outcome.executionsRun) {
		if (exec.status === 'running' || !exec.id) continue;
		try {
			const detail = await client.getExecution(exec.id);
			const { error, failedNode } = extractErrorFromExecution(detail.data);
			if (error) exec.error = error;
			if (failedNode) exec.failedNode = failedNode;
			exec.outputData = extractOutputFromExecution(detail.data);
		} catch {
			// Non-fatal -- keep existing summary
		}
	}

	// Force-execute workflows that weren't run by the agent
	for (const wf of outcome.workflowsCreated) {
		if (alreadyExecutedWorkflowIds.has(wf.id)) continue;

		const triggerNode = findTriggerNode(outcome.workflowJsons, wf.id);

		// Find all matching test inputs for this trigger type
		const matchingInputs = testInputs ? findMatchingTestInputs(triggerNode?.type, testInputs) : [];

		// Skip non-executable triggers ONLY when no test inputs are available
		if (
			matchingInputs.length === 0 &&
			triggerNode &&
			NON_EXECUTABLE_TRIGGERS.has(triggerNode.type)
		) {
			outcome.executionsRun.push({
				id: '',
				workflowId: wf.id,
				status: 'skipped',
				triggeredByEval: true,
			});
			continue;
		}

		// Remove any previous skipped entry for this workflow
		const skippedIdx = outcome.executionsRun.findIndex(
			(e) => e.workflowId === wf.id && e.status === 'skipped',
		);
		if (skippedIdx >= 0) {
			outcome.executionsRun.splice(skippedIdx, 1);
		}

		try {
			if (matchingInputs.length > 0 && triggerNode) {
				const isWebhook = nodeTypeToTriggerType(triggerNode.type) === 'webhook';

				if (isWebhook) {
					// Execute via live webhook URL with each test payload
					const summaries = await executeViaWebhook(client, wf.id, matchingInputs);
					outcome.executionsRun.push(...summaries);
				} else {
					// Use pin data for non-webhook triggers (form, schedule, manual)
					for (const input of matchingInputs) {
						const executionSummary = await executeWithPinData(
							client,
							wf.id,
							triggerNode.name,
							triggerNode.type,
							input,
							servicePinData,
						);
						outcome.executionsRun.push(executionSummary);
					}
				}
			} else {
				// Execute without pin data (existing behavior)
				const { executionId } = await client.executeWorkflow(wf.id, triggerNode?.name);
				const executionSummary = await pollExecution(client, executionId, wf.id);
				outcome.executionsRun.push(executionSummary);
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
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

/**
 * Find the first trigger node in a workflow JSON by workflow ID.
 */
export function findTriggerNode(
	workflowJsons: WorkflowResponse[],
	workflowId: string,
): WorkflowNodeResponse | undefined {
	const wfJson = workflowJsons.find((wf) => wf.id === workflowId);
	if (!wfJson) return undefined;

	// Find the first trigger node (type contains "trigger" or "Trigger", or is a webhook/schedule)
	return wfJson.nodes.find(
		(n) =>
			n.type.toLowerCase().includes('trigger') ||
			n.type === 'n8n-nodes-base.webhook' ||
			n.type === 'n8n-nodes-base.manualTrigger',
	);
}

// ---------------------------------------------------------------------------
// Trigger type mapping
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

function findMatchingTestInputs(
	nodeType: string | undefined,
	testInputs: ExecutionTestInput[],
): ExecutionTestInput[] {
	if (!nodeType || testInputs.length === 0) return [];
	const triggerType = nodeTypeToTriggerType(nodeType);
	if (!triggerType) return [];
	return testInputs.filter((input) => input.triggerType === triggerType);
}

// ---------------------------------------------------------------------------
// Pin data helpers
// ---------------------------------------------------------------------------

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
 * Execute a workflow using pin data on the trigger node and optionally
 * on service nodes. Merges trigger pin data with service node pin data
 * so the trigger gets test input while service nodes get realistic mock data.
 *
 * Sets pin data -> executes -> polls -> captures output -> restores pin data.
 */
async function executeWithPinData(
	client: N8nClient,
	workflowId: string,
	triggerNodeName: string,
	triggerNodeType: string,
	testInput: ExecutionTestInput,
	servicePinData?: PinData,
): Promise<ExecutionSummary> {
	// Save original workflow to restore pin data later
	const originalWorkflow = await client.getWorkflow(workflowId);
	const originalPinData = originalWorkflow.pinData ?? null;

	const triggerPinData = buildPinData(triggerNodeName, triggerNodeType, testInput);
	const pinData = servicePinData ? { ...servicePinData, ...triggerPinData } : triggerPinData;

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
			// Non-fatal -- pin data restoration failure
		}
	}
}

/**
 * Execute a workflow with pre-generated pin data covering all nodes
 * (trigger + service). Used by the scenario-based evaluation flow where
 * pin data is generated in a single LLM call for consistency.
 *
 * Sets pin data -> finds trigger -> executes -> polls -> restores pin data.
 */
export async function executeWithFullPinData(
	client: N8nClient,
	workflowId: string,
	pinData: PinData,
	workflowJsons: WorkflowResponse[],
): Promise<ExecutionSummary> {
	const originalWorkflow = await client.getWorkflow(workflowId);
	const originalPinData = originalWorkflow.pinData ?? null;

	const triggerNode = findTriggerNode(workflowJsons, workflowId);
	const pinnedNodeNames = Object.keys(pinData);

	console.log(
		`    [exec] Trigger: ${triggerNode?.name ?? '(none)'} (${triggerNode?.type ?? 'unknown'})`,
	);

	// Log existing pin data on the workflow BEFORE our update
	const existingPinDataKeys = Object.keys(originalWorkflow.pinData ?? {});
	console.log(
		`    [exec] Existing pin data on workflow: ${existingPinDataKeys.length > 0 ? existingPinDataKeys.join(', ') : '(none)'}`,
	);
	for (const [name, data] of Object.entries(originalWorkflow.pinData ?? {})) {
		const preview = JSON.stringify(data).slice(0, 120);
		console.log(`    [exec]   EXISTING ${name}: ${preview}`);
	}

	// Log what we're applying
	console.log(
		`    [exec] Generated pin data for ${String(pinnedNodeNames.length)} node(s): ${pinnedNodeNames.join(', ')}`,
	);
	for (const [name, data] of Object.entries(pinData)) {
		const preview = JSON.stringify(data).slice(0, 120);
		console.log(`    [exec]   GENERATED ${name}: ${preview}`);
	}

	try {
		await client.updateWorkflow(workflowId, { pinData });

		// Verify what the workflow actually has after update
		const updatedWorkflow = await client.getWorkflow(workflowId);
		const updatedPinDataKeys = Object.keys(updatedWorkflow.pinData ?? {});
		console.log(
			`    [exec] Pin data AFTER update: ${updatedPinDataKeys.length > 0 ? updatedPinDataKeys.join(', ') : '(none)'}`,
		);
		for (const [name, data] of Object.entries(updatedWorkflow.pinData ?? {})) {
			const preview = JSON.stringify(data).slice(0, 120);
			console.log(`    [exec]   ACTUAL ${name}: ${preview}`);
		}

		const { executionId } = await client.executeWorkflow(workflowId, triggerNode?.name);
		console.log(`    [exec] Execution started: ${executionId}`);

		const result = await pollExecution(client, executionId, workflowId);
		console.log(
			`    [exec] Execution finished: ${result.status}${result.error ? ` (${result.error.slice(0, 100)})` : ''}`,
		);
		if (result.outputData && result.outputData.length > 0) {
			for (const nodeOutput of result.outputData) {
				const preview = JSON.stringify(nodeOutput.data).slice(0, 150);
				console.log(`    [exec]   OUTPUT ${nodeOutput.nodeName}: ${preview}`);
			}
		}

		return result;
	} finally {
		try {
			await client.updateWorkflow(workflowId, {
				pinData: originalPinData ?? {},
			});
		} catch {
			// Non-fatal -- pin data restoration failure
		}
	}
}

// ---------------------------------------------------------------------------
// Webhook execution
// ---------------------------------------------------------------------------

/**
 * Execute a webhook workflow by calling the live webhook URL.
 * Activates the workflow, calls the webhook for each test input,
 * polls for execution results, then deactivates.
 */
async function executeViaWebhook(
	client: N8nClient,
	workflowId: string,
	testInputs: ExecutionTestInput[],
): Promise<ExecutionSummary[]> {
	const summaries: ExecutionSummary[] = [];

	try {
		await client.activateWorkflow(workflowId);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return [
			{
				id: '',
				workflowId,
				status: 'error',
				error: `Failed to activate workflow for webhook execution: ${errorMessage}`,
				triggeredByEval: true,
			},
		];
	}

	try {
		for (const input of testInputs) {
			const webhookPath = input.path ?? '';
			const httpMethod = input.httpMethod ?? 'POST';

			if (!webhookPath) {
				summaries.push({
					id: '',
					workflowId,
					status: 'error',
					error: 'No webhook path provided in test input',
					triggeredByEval: true,
				});
				continue;
			}

			try {
				// Snapshot execution IDs before calling the webhook
				const preCallExecIds = new Set((await client.listExecutions(workflowId)).map((e) => e.id));

				// Call the live webhook
				const webhookResponse = await client.callWebhook(
					webhookPath,
					httpMethod,
					httpMethod.toUpperCase() !== 'GET' ? input.testData : undefined,
				);

				// Find the new execution created by the webhook call.
				// The response is already back, so the execution should be done.
				const execSummary = await pollNewExecution(client, workflowId, preCallExecIds);

				summaries.push({
					...execSummary,
					webhookResponse: {
						status: webhookResponse.status,
						body: webhookResponse.data,
					},
				});
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				summaries.push({
					id: '',
					workflowId,
					status: 'error',
					error: `Webhook call failed: ${errorMessage}`,
					triggeredByEval: true,
				});
			}
		}
	} finally {
		// Always deactivate (best-effort)
		try {
			await client.deactivateWorkflow(workflowId);
		} catch {
			// Non-fatal
		}
	}

	return summaries;
}

// ---------------------------------------------------------------------------
// Execution polling
// ---------------------------------------------------------------------------

/**
 * Poll for a NEW execution of a workflow that didn't exist before.
 * Uses a snapshot of pre-existing execution IDs to find the one
 * created by the webhook call. Best-effort -- if the execution can't
 * be found (e.g. "Respond to Webhook" already completed), returns a
 * minimal summary. The webhook HTTP response is captured separately
 * and provides the primary verification data.
 */
async function pollNewExecution(
	client: N8nClient,
	workflowId: string,
	preCallExecIds: Set<string>,
): Promise<ExecutionSummary> {
	const deadline = Date.now() + EXECUTION_POLL_TIMEOUT_MS;

	while (Date.now() < deadline) {
		try {
			const executions = await client.listExecutions(workflowId);
			// Find an execution that didn't exist before the webhook call
			const newExec = executions.find((e) => !preCallExecIds.has(e.id));
			if (newExec && newExec.status !== 'running' && newExec.status !== 'new') {
				const detail = await client.getExecution(newExec.id);
				const { error, failedNode } = extractErrorFromExecution(detail.data);
				const outputData = extractOutputFromExecution(detail.data);
				return {
					id: newExec.id,
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

	// Timeout -- the webhook response is still available for verification
	return {
		id: '',
		workflowId,
		status: 'webhook-only',
		triggeredByEval: true,
	};
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

// ---------------------------------------------------------------------------
// Flatted execution data extraction
// ---------------------------------------------------------------------------

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
