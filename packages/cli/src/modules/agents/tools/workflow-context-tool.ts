import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { z } from 'zod';

import { trimItems, runQuery } from './agent-data-utils';

const DESCRIPTION =
	'Inspect data produced by OTHER earlier nodes in this workflow. ' +
	'Call without arguments to list the nodes that have executed so far. ' +
	'Call with a nodeName to read that node output (last run). ' +
	'Pass a JMESPath query together with a nodeName to extract a specific part of large output.';

/** Items of the last run's main output, flattened across output branches. */
function lastRunMainItems(runs: ITaskData[]): INodeExecutionData[] {
	const lastRun = runs[runs.length - 1];
	const mainBranches = lastRun?.data?.main ?? [];
	return mainBranches.flatMap((branch) => branch ?? []);
}

/** Item count of the last run's main output across branches, without materializing. */
function lastRunMainItemCount(runs: ITaskData[]): number {
	const lastRun = runs[runs.length - 1];
	const mainBranches = lastRun?.data?.main ?? [];
	return mainBranches.reduce((count, branch) => count + (branch?.length ?? 0), 0);
}

/**
 * Builds the opt-in `fetch_workflow_context` tool: lets the agent inspect any
 * other node's execution data in the calling workflow. Attached only when the
 * MessageAnAgent node enables "Allow agent to access other nodes' data".
 */
export function createWorkflowContextTool(context: ExecuteAgentWorkflowContext): BuiltTool {
	const nodeTypesByName = new Map((context.nodes ?? []).map((node) => [node.name, node.type]));

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
					query: z
						.string()
						.optional()
						.describe(
							'JMESPath query to retrieve a specific part of the node output, untrimmed. The output is ' +
								'a JSON array of item objects (index the first item as `[0]`, not `items[0]`; there is ' +
								'no `json` wrapper) — e.g. `[0]`, `[0].fieldName`, `[*].fieldName`. Use only when a ' +
								'previous non-query result came back truncated.',
						),
				}),
			)
			.systemInstruction(
				'To inspect data produced by OTHER earlier nodes in this workflow, call ' +
					'fetch_workflow_context with no arguments to list executed nodes, then with a nodeName ' +
					'to read that node output. A node output is a JSON array of item objects (index the first ' +
					'item as `[0]`, not `items[0]`; there is no `json` wrapper). Pass a JMESPath query with a ' +
					'nodeName only when a previous result came back truncated — never re-query data you already ' +
					'received in full.',
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async (input) => {
				const { nodeName, query } = input as { nodeName?: string; query?: string };
				const runData = context.runExecutionData.resultData.runData;

				if (!nodeName) {
					if (query) {
						return { error: 'Specify a nodeName to run a query against that node output.' };
					}
					return {
						workflow: { id: context.workflowId ?? null, name: context.workflowName ?? null },
						invokedBy: context.callingNodeName,
						executedNodes: Object.entries(runData).map(([name, runs]) => ({
							name,
							type: nodeTypesByName.get(name) ?? 'unknown',
							status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
							runs: runs.length,
							items: lastRunMainItemCount(runs),
						})),
					};
				}

				const runs = Object.hasOwn(runData, nodeName) ? runData[nodeName] : undefined;
				if (!runs?.length) {
					return {
						error: `No execution data found for node '${nodeName}'.`,
						availableNodes: Object.keys(runData),
					};
				}

				const allItems = lastRunMainItems(runs);

				if (query) {
					return {
						nodeName,
						query,
						...runQuery(
							allItems.map((item) => item.json),
							query,
						),
					};
				}

				const { items, truncated } = trimItems(allItems);
				return {
					nodeName,
					status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
					runs: runs.length,
					totalItems: allItems.length,
					items,
					truncated,
				};
			})
			.build()
	);
}
