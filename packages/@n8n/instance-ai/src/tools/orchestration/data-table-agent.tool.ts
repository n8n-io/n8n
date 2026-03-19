/**
 * Preconfigured Data Table Agent Tool
 *
 * Creates a focused sub-agent for data table management (CRUD on tables,
 * columns, and rows). Uses consumeStreamWithHitl for HITL on destructive
 * operations (delete-data-table, delete-data-table-rows).
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { DATA_TABLE_AGENT_PROMPT } from './data-table-agent.prompt';
import { truncateLabel } from './display-utils';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createSubAgentMemory, subAgentResourceId } from '../../memory/sub-agent-memory';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import type { OrchestrationContext } from '../../types';

const DATA_TABLE_MAX_STEPS = 15;

const DATA_TABLE_TOOL_NAMES = [
	'list-data-tables',
	'create-data-table',
	'delete-data-table',
	'get-data-table-schema',
	'add-data-table-column',
	'delete-data-table-column',
	'rename-data-table-column',
	'query-data-table-rows',
	'insert-data-table-rows',
	'update-data-table-rows',
	'delete-data-table-rows',
];

function buildDataTableOutcome(text: string) {
	const createdMatch = /Created table '([^']+)' \(ID: `([^`]+)`\)/.exec(text);
	if (!createdMatch) {
		return {
			kind: 'data-table' as const,
			action: 'unknown' as const,
			summary: text,
		};
	}

	const inlineCodeMatches = [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
	const columnNames = inlineCodeMatches.slice(1);

	return {
		kind: 'data-table' as const,
		action: 'created' as const,
		tableName: createdMatch[1],
		tableId: createdMatch[2],
		...(columnNames.length > 0 ? { columnNames } : {}),
		summary: text,
	};
}

export function createDataTableAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'manage-data-tables-with-agent',
		description:
			'Manage data tables using a specialized agent. ' +
			'The agent handles listing, creating, deleting tables, modifying schemas, ' +
			'and querying/inserting/updating/deleting rows.',
		inputSchema: z.object({
			task: z
				.string()
				.describe(
					'What to do: describe the data table operation. Include table names, column details, data to insert, or query criteria.',
				),
			planId: z.string().optional().describe('Plan ID for task/phase tracking.'),
			phaseId: z.string().optional().describe('Phase ID for task/phase tracking.'),
		}),
		outputSchema: z.object({
			result: z.string(),
		}),
		// eslint-disable-next-line @typescript-eslint/require-await -- framework requires Promise return but body is sync
		execute: async (input) => {
			// Collect data table tools from the domain tools
			const dataTableTools: ToolsInput = {};
			for (const name of DATA_TABLE_TOOL_NAMES) {
				if (name in context.domainTools) {
					dataTableTools[name] = context.domainTools[name];
				}
			}

			if (Object.keys(dataTableTools).length === 0) {
				return { result: 'Error: no data table tools available.' };
			}

			if (!context.spawnBackgroundTask) {
				return { result: 'Error: background task support not available.' };
			}

			const subAgentId = `agent-datatable-${nanoid(6)}`;
			const taskId = `datatable-${nanoid(8)}`;

			// Publish agent-spawned so the UI shows the data table agent immediately
			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: 'data-table-manager',
					tools: Object.keys(dataTableTools),
					taskId,
					kind: 'data-table',
					title: 'Managing data table',
					subtitle: truncateLabel(input.task),
					goal: input.task,
					targetResource: { type: 'data-table' as const },
				},
			});

			const task = input.task;

			// Spawn data table agent as a background task — returns immediately
			context.spawnBackgroundTask({
				taskId,
				threadId: context.threadId,
				agentId: subAgentId,
				role: 'data-table-manager',
				kind: 'data-table',
				title: 'Managing data table',
				subtitle: truncateLabel(input.task),
				goal: input.task,
				targetResource: { type: 'data-table' as const },
				planId: input.planId,
				phaseId: input.phaseId,
				run: async (signal, _drainCorrections) => {
					const dataTableMemory = createSubAgentMemory(context.storage, 'data-table-manager');

					const subAgent = new Agent({
						id: subAgentId,
						name: 'Data Table Agent',
						instructions: {
							role: 'system' as const,
							content: DATA_TABLE_AGENT_PROMPT,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
						},
						model: context.modelId,
						tools: dataTableTools,
						memory: dataTableMemory,
					});

					registerWithMastra(subAgentId, subAgent, context.storage);

					const dtMemoryOpts = dataTableMemory
						? {
								resource: subAgentResourceId(context.userId, 'data-table-manager'),
								thread: subAgentId,
							}
						: undefined;

					const stream = await subAgent.stream(task, {
						maxSteps: DATA_TABLE_MAX_STEPS,
						abortSignal: signal,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
						...(dtMemoryOpts ? { memory: dtMemoryOpts } : {}),
					});

					const hitlResult = await consumeStreamWithHitl({
						agent: subAgent,
						stream: stream as {
							runId?: string;
							fullStream: AsyncIterable<unknown>;
							text: Promise<string>;
						},
						runId: context.runId,
						agentId: subAgentId,
						eventBus: context.eventBus,
						threadId: context.threadId,
						abortSignal: signal,
						waitForConfirmation: context.waitForConfirmation,
					});

					const text = await hitlResult.text;

					return {
						text,
						outcome: buildDataTableOutcome(text),
					};
				},
			});

			return {
				result: `Data table operation started (task: ${taskId}). Acknowledge briefly and move on.`,
			};
		},
	});
}
