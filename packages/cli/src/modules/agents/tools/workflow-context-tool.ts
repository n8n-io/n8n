import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { z } from 'zod';

const MAX_ITEMS = 20;
const MAX_OUTPUT_CHARS = 50_000;

const DESCRIPTION =
	'Inspect the n8n workflow execution that invoked this agent. ' +
	'Call without arguments to list the nodes that have executed so far. ' +
	'Call with a nodeName to read the output data that node produced.';

/** Items of the last run's main output, flattened across output branches. */
function lastRunMainItems(runs: ITaskData[]): INodeExecutionData[] {
	const lastRun = runs[runs.length - 1];
	const mainBranches = lastRun?.data?.main ?? [];
	return mainBranches.flatMap((branch) => branch ?? []);
}

/** Strips binary payloads down to their key names — the agent only needs to know they exist. */
function toSafeItem(item: INodeExecutionData): Record<string, unknown> {
	const safe: Record<string, unknown> = { json: item.json };
	if (item.binary) {
		safe.binary = Object.keys(item.binary);
	}
	return safe;
}

/**
 * Builds the per-invocation `fetch_workflow_context` tool for agents invoked
 * from a workflow (MessageAnAgent node). The handler closes over the calling
 * execution's in-memory run data; the tool's system instruction is merged into
 * the agent's prompt by the runtime (`composeEffectiveInstructions`).
 */
export function createWorkflowContextTool(context: ExecuteAgentWorkflowContext): BuiltTool {
	const nodeTypesByName = new Map(context.nodes.map((node) => [node.name, node.type]));
	const workflowLabel = context.workflowName ?? context.workflowId ?? 'unknown';

	return (
		new Tool('fetch_workflow_context')
			.description(DESCRIPTION)
			.input(
				z.object({
					nodeName: z
						.string()
						.optional()
						.describe(
							'Name of an executed node whose output data to fetch. Omit to list all executed nodes.',
						),
				}),
			)
			.systemInstruction(
				`You were invoked from the n8n workflow '${workflowLabel}' by its node '${context.callingNodeName}'. ` +
					'To inspect data produced by earlier workflow nodes, call fetch_workflow_context with no arguments ' +
					'to list executed nodes, then call it with a nodeName to read that node output. ' +
					'Use it whenever the message references data from the workflow.',
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async (input) => {
				const { nodeName } = input as { nodeName?: string };
				const runData = context.runExecutionData.resultData.runData;

				if (!nodeName) {
					return {
						workflow: { id: context.workflowId ?? null, name: context.workflowName ?? null },
						invokedBy: context.callingNodeName,
						executedNodes: Object.entries(runData).map(([name, runs]) => ({
							name,
							type: nodeTypesByName.get(name) ?? 'unknown',
							status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
							runs: runs.length,
							items: lastRunMainItems(runs).length,
						})),
					};
				}

				const runs = runData[nodeName];
				if (!runs?.length) {
					return {
						error: `No execution data found for node '${nodeName}'.`,
						availableNodes: Object.keys(runData),
					};
				}

				const allItems = lastRunMainItems(runs);
				const items: Array<Record<string, unknown>> = [];
				let serializedSize = 0;
				for (const item of allItems.slice(0, MAX_ITEMS)) {
					const safe = toSafeItem(item);
					serializedSize += JSON.stringify(safe).length;
					// Always include the first item so the agent gets something,
					// even when a single item exceeds the cap.
					if (items.length > 0 && serializedSize > MAX_OUTPUT_CHARS) break;
					items.push(safe);
				}

				return {
					nodeName,
					status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
					runs: runs.length,
					totalItems: allItems.length,
					items,
					truncated: items.length < allItems.length,
				};
			})
			.build()
	);
}
