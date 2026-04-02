import type { Memory } from '@mastra/memory';
import { z } from 'zod';

import type { PlannedTaskGraph } from '../types';
import { patchThread } from './thread-patch';

const METADATA_KEY = 'instanceAiPlannedTasks';

const plannedTaskKindSchema = z.enum([
	'delegate',
	'build-workflow',
	'manage-data-tables',
	'research',
]);

const plannedTaskStatusSchema = z.enum(['planned', 'running', 'succeeded', 'failed', 'cancelled']);

const plannedTaskRecordSchema = z.object({
	id: z.string(),
	title: z.string(),
	kind: plannedTaskKindSchema,
	spec: z.string(),
	deps: z.array(z.string()),
	tools: z.array(z.string()).optional(),
	workflowId: z.string().optional(),
	status: plannedTaskStatusSchema,
	agentId: z.string().optional(),
	backgroundTaskId: z.string().optional(),
	result: z.string().optional(),
	error: z.string().optional(),
	outcome: z.record(z.unknown()).optional(),
	startedAt: z.number().optional(),
	finishedAt: z.number().optional(),
});

const plannedTaskGraphSchema = z.object({
	planRunId: z.string(),
	messageGroupId: z.string().optional(),
	status: z.enum(['active', 'awaiting_replan', 'completed', 'cancelled']),
	tasks: z.array(plannedTaskRecordSchema),
});

function parseGraph(raw: unknown): PlannedTaskGraph | null {
	const result = plannedTaskGraphSchema.safeParse(raw);
	return result.success ? result.data : null;
}

export class PlannedTaskStorage {
	constructor(private readonly memory: Memory) {}

	async get(threadId: string): Promise<PlannedTaskGraph | null> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[METADATA_KEY]) return null;
		return parseGraph(thread.metadata[METADATA_KEY]);
	}

	async save(threadId: string, graph: PlannedTaskGraph): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata }) => ({
				metadata: {
					...metadata,
					[METADATA_KEY]: graph,
				},
			}),
		});
	}

	/**
	 * Atomically read-modify-write the graph inside a single patchThread call.
	 * Returns the updated graph, or null if no graph exists.
	 */
	async update(
		threadId: string,
		updater: (graph: PlannedTaskGraph) => PlannedTaskGraph | null,
	): Promise<PlannedTaskGraph | null> {
		let result: PlannedTaskGraph | null = null;

		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const current = parseGraph(metadata[METADATA_KEY]);
				if (!current) return null;

				const updated = updater(current);
				result = updated;
				if (!updated) return null;

				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: updated,
					},
				};
			},
		});

		return result;
	}

	async clear(threadId: string): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata }) => {
				const nextMetadata = { ...metadata };
				delete nextMetadata[METADATA_KEY];
				return { metadata: nextMetadata };
			},
		});
	}
}
