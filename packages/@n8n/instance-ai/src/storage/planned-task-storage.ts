import { z } from 'zod';

import {
	PLANNED_TASK_KINDS,
	STORED_PLANNED_TASK_KINDS,
	type PlannedTaskGraph,
	type PlannedTaskKind,
	type PlannedTaskRecord,
	type StoredPlannedTaskKind,
} from '../types';
import { getThread, patchThread, type PatchableThreadMemory } from './thread-patch';

const METADATA_KEY = 'instanceAiPlannedTasks';
const LEGACY_TASK_REPLAN_ERROR =
	'This data-table task was created by an older planner and needs replanning.';

const plannedTaskKindSchema = z.enum(STORED_PLANNED_TASK_KINDS);
const plannedTaskKindSet: ReadonlySet<string> = new Set(PLANNED_TASK_KINDS);

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
	status: z.enum(['awaiting_approval', 'active', 'awaiting_replan', 'completed', 'cancelled']),
	tasks: z.array(plannedTaskRecordSchema),
});

type StoredPlannedTaskRecord = Omit<PlannedTaskRecord, 'kind'> & {
	kind: StoredPlannedTaskKind;
};

type StoredPlannedTaskGraph = Omit<PlannedTaskGraph, 'tasks'> & {
	tasks: StoredPlannedTaskRecord[];
};

function isPlannedTaskKind(kind: StoredPlannedTaskKind): kind is PlannedTaskKind {
	return plannedTaskKindSet.has(kind);
}

function normalizeStoredTask(task: StoredPlannedTaskRecord): PlannedTaskRecord {
	if (isPlannedTaskKind(task.kind)) return { ...task, kind: task.kind };

	const needsReplan = task.status === 'planned' || task.status === 'running';
	return {
		...task,
		kind: 'delegate',
		status: needsReplan ? 'failed' : task.status,
		error: task.error ?? (needsReplan ? LEGACY_TASK_REPLAN_ERROR : undefined),
		finishedAt: needsReplan ? (task.finishedAt ?? Date.now()) : task.finishedAt,
	};
}

function normalizeStoredGraph(graph: StoredPlannedTaskGraph): PlannedTaskGraph {
	return {
		...graph,
		tasks: graph.tasks.map(normalizeStoredTask),
	};
}

function parseGraph(raw: unknown): PlannedTaskGraph | null {
	const result = plannedTaskGraphSchema.safeParse(raw);
	return result.success ? normalizeStoredGraph(result.data) : null;
}

export class PlannedTaskStorage {
	constructor(private readonly memory: PatchableThreadMemory) {}

	async get(threadId: string): Promise<PlannedTaskGraph | null> {
		const thread = await getThread(this.memory, threadId);
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
