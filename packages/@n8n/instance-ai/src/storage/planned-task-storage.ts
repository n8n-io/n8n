import type { Memory } from '@mastra/memory';
import { z } from 'zod';

import {
	DELEGATE_DEFAULT_INSTRUCTIONS,
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

const plannedTaskKindSchema = z.enum([
	'delegate',
	'build-workflow',
	'manage-data-tables',
	'research',
	'checkpoint',
]);

const plannedTaskStatusSchema = z.enum(['planned', 'running', 'succeeded', 'failed', 'cancelled']);

const plannedTaskRecordSchema = z
	.object({
		id: z.string(),
		title: z.string(),
		kind: plannedTaskKindSchema,
		deps: z.array(z.string()),
		tools: z.array(z.string()).optional(),
		handoff: plannedHandoffSchema.optional(),
		spec: z.string().optional(),
		status: plannedTaskStatusSchema,
		agentId: z.string().optional(),
		backgroundTaskId: z.string().optional(),
		result: z.string().optional(),
		error: z.string().optional(),
		outcome: z.unknown().optional(),
		startedAt: z.number().optional(),
		finishedAt: z.number().optional(),
	})
	.superRefine((task, ctx) => {
		if (task.kind === 'checkpoint') {
			if (!task.spec) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Checkpoint tasks must include spec instructions',
					path: ['spec'],
				});
			}
			return;
		}

		if (!task.handoff) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Sub-agent tasks must include a typed handoff',
				path: ['handoff'],
			});
			return;
		}

		if (task.handoff.kind !== task.kind) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Task kind must match handoff kind',
				path: ['handoff', 'kind'],
			});
		}
	});

const plannedTaskGraphSchema = z.object({
	planRunId: z.string(),
	messageGroupId: z.string().optional(),
	status: z.enum(['awaiting_approval', 'active', 'awaiting_replan', 'completed', 'cancelled']),
	tasks: z.array(plannedTaskRecordSchema),
});

const preTypedHandoffTaskRecordSchema = z.object({
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
	outcome: z.unknown().optional(),
	startedAt: z.number().optional(),
	finishedAt: z.number().optional(),
});

const preTypedHandoffTaskGraphSchema = z.object({
	planRunId: z.string(),
	messageGroupId: z.string().optional(),
	status: z.enum(['awaiting_approval', 'active', 'awaiting_replan', 'completed', 'cancelled']),
	tasks: z.array(preTypedHandoffTaskRecordSchema),
});

type PreTypedHandoffTaskRecord = z.infer<typeof preTypedHandoffTaskRecordSchema>;

function addHandoffToPreTypedTask(task: PreTypedHandoffTaskRecord): unknown {
	if (task.kind === 'checkpoint') return task;

	switch (task.kind) {
		case 'delegate':
			return {
				...task,
				handoff: {
					taskKey: task.id,
					kind: 'delegate',
					input: {
						role: task.title,
						instructions: DELEGATE_DEFAULT_INSTRUCTIONS,
						goal: task.spec,
						toolNames: task.tools ?? [],
					},
				},
			};
		case 'build-workflow':
			return {
				...task,
				handoff: {
					taskKey: task.id,
					kind: 'build-workflow',
					input: {
						goal: task.spec,
						workflowId: task.workflowId,
						workItemId: `wi_${task.id}`,
						sandboxMode: true,
					},
				},
			};
		case 'manage-data-tables':
			return {
				...task,
				handoff: {
					taskKey: task.id,
					kind: 'manage-data-tables',
					input: { goal: task.spec },
				},
			};
		case 'research':
			return {
				...task,
				handoff: {
					taskKey: task.id,
					kind: 'research',
					input: { goal: task.title, constraints: task.spec },
				},
			};
	}
}

function normalizePreTypedHandoffGraph(raw: unknown): PlannedTaskGraph | null {
	const parsed = preTypedHandoffTaskGraphSchema.safeParse(raw);
	if (!parsed.success) return null;

	const normalized = {
		...parsed.data,
		tasks: parsed.data.tasks.map(addHandoffToPreTypedTask),
	};
	const result = plannedTaskGraphSchema.safeParse(normalized);
	return result.success ? (result.data as unknown as PlannedTaskGraph) : null;
}

function parseGraph(raw: unknown): PlannedTaskGraph | null {
	const result = plannedTaskGraphSchema.safeParse(raw);
	if (result.success) return result.data as unknown as PlannedTaskGraph;

	// Keep in-flight plans created before typed sub-agent handoffs readable after upgrade.
	return normalizePreTypedHandoffGraph(raw);
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
