import type { Memory } from '@mastra/memory';
import { z } from 'zod';

import {
	builderHandoffInputSchema,
	dataTableHandoffInputSchema,
	delegateHandoffInputSchema,
	researchHandoffInputSchema,
} from '../agent/handoff';
import type { PlannedTaskGraph } from '../types';
import { patchThread } from './thread-patch';

const METADATA_KEY = 'instanceAiPlannedTasks';

const plannedHandoffSchema = z.discriminatedUnion('kind', [
	z.object({
		taskKey: z.string(),
		kind: z.literal('delegate'),
		input: delegateHandoffInputSchema,
	}),
	z.object({
		taskKey: z.string(),
		kind: z.literal('build-workflow'),
		input: builderHandoffInputSchema,
	}),
	z.object({
		taskKey: z.string(),
		kind: z.literal('manage-data-tables'),
		input: dataTableHandoffInputSchema,
	}),
	z.object({
		taskKey: z.string(),
		kind: z.literal('research'),
		input: researchHandoffInputSchema,
	}),
]);

const plannedTaskStatusSchema = z.enum(['planned', 'running', 'succeeded', 'failed', 'cancelled']);

// The outcome envelope stored on PlannedTaskRecord. Loose on the payload because
// today only the builder populates it with a typed WorkflowBuildOutcome — other
// kinds may add typed payloads later without a schema migration.
const subAgentOutcomeStorageSchema = z
	.object({
		taskKey: z.string(),
		kind: z.string(),
		status: z.enum(['completed', 'failed', 'cancelled']),
		resultText: z.string(),
		durationMs: z.number(),
		toolCallCount: z.number(),
		toolErrorCount: z.number(),
		blockers: z.array(z.string()).optional(),
		stoppingReason: z.string().optional(),
		payload: z.unknown().optional(),
		planSubmitted: z.boolean().optional(),
	})
	.passthrough();

const plannedTaskRecordSchema = z.object({
	id: z.string(),
	title: z.string(),
	deps: z.array(z.string()),
	tools: z.array(z.string()).optional(),
	handoff: plannedHandoffSchema,
	status: plannedTaskStatusSchema,
	agentId: z.string().optional(),
	backgroundTaskId: z.string().optional(),
	result: z.string().optional(),
	error: z.string().optional(),
	outcome: subAgentOutcomeStorageSchema.optional(),
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
	// The storage schema's outcome is validated loosely (passthrough with
	// string kind) so writer-enforced typed outcomes round-trip without
	// needing the storage layer to mirror the full `SubAgentOutcome` union.
	return result.success ? (result.data as unknown as PlannedTaskGraph) : null;
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
