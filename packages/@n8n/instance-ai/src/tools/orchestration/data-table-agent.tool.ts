/**
 * Preconfigured Data Table Agent Tool
 *
 * Creates a focused sub-agent for data table management (CRUD on tables,
 * columns, and rows). Includes suspend/resume loop for HITL on destructive
 * operations (delete-data-table, delete-data-table-rows).
 *
 * Pattern follows build-workflow-agent.tool.ts + delegate.tool.ts HITL loop.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { createTool } from '@mastra/core/tools';
import { LangSmithExporter } from '@mastra/langsmith';
import { Observability } from '@mastra/observability';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { DATA_TABLE_AGENT_PROMPT } from './data-table-agent.prompt';
import { createSubAgentMemory, subAgentResourceId } from '../../memory/sub-agent-memory';
import { mapMastraChunkToEvent } from '../../stream/map-chunk';
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
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
				},
			});

			const task = input.task;

			// Spawn data table agent as a background task — returns immediately
			context.spawnBackgroundTask({
				taskId,
				threadId: context.threadId,
				agentId: subAgentId,
				role: 'data-table-manager',
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

					// Register with Mastra for HITL suspend/resume state persistence
					new Mastra({
						agents: { [subAgentId]: subAgent },
						storage: context.storage,
						observability: new Observability({
							configs: {
								langsmith: {
									serviceName: 'my-service',
									exporters: [new LangSmithExporter({ projectName: 'instance-ai' })],
								},
							},
						}),
					});

					// Stream with HITL suspend/resume loop
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

					let subAgentStream: AsyncIterable<unknown> = stream.fullStream;
					let subMastraRunId = (stream as { runId?: string }).runId ?? '';
					let streamCompleted = false;

					while (!streamCompleted) {
						let suspended: { toolCallId: string; requestId: string } | null = null;

						for await (const chunk of subAgentStream) {
							if (signal.aborted) break;
							if (isRecord(chunk) && chunk.type === 'tool-call-suspended') {
								const sp = isRecord(chunk.payload) ? chunk.payload : {};
								const suspPayload = isRecord(sp.suspendPayload) ? sp.suspendPayload : {};
								const tcId = typeof sp.toolCallId === 'string' ? sp.toolCallId : '';
								const reqId =
									typeof suspPayload.requestId === 'string' && suspPayload.requestId
										? suspPayload.requestId
										: tcId;
								if (reqId && tcId) {
									suspended = { toolCallId: tcId, requestId: reqId };
								}
							}
							const event = mapMastraChunkToEvent(context.runId, subAgentId, chunk);
							if (event) {
								context.eventBus.publish(context.threadId, event);
							}
						}

						if (suspended) {
							if (!context.waitForConfirmation) {
								throw new Error(
									'Data table agent tool requires confirmation but no HITL handler is available',
								);
							}
							// Blocks the BACKGROUND TASK (not the orchestrator) while waiting
							const confirmResult = await context.waitForConfirmation(suspended.requestId);
							const resumable = subAgent as unknown as {
								resumeStream: (
									data: Record<string, unknown>,
									options: Record<string, unknown>,
								) => Promise<{ runId?: string; fullStream: AsyncIterable<unknown> }>;
							};
							const resumed = await resumable.resumeStream(confirmResult, {
								runId: subMastraRunId,
								toolCallId: suspended.toolCallId,
							});
							subMastraRunId =
								(typeof resumed.runId === 'string' ? resumed.runId : '') || subMastraRunId;
							subAgentStream = resumed.fullStream;
						} else {
							streamCompleted = true;
						}
					}

					return await stream.text;
				},
			});

			return {
				result: `Data table operation started (task: ${taskId}). Acknowledge briefly and move on.`,
			};
		},
	});
}
