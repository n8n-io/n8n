import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { planLeaves } from './agent-plan-state';
import type { OperationContext } from '@n8n/db';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { AgentPlanService, AgentPlanSnapshot } from '../agent-plan.service';
import { AgentPlanWriteConflictError } from '../repositories/agent-plan.repository';
import {
	AGENT_PLAN_FORMAT_VERSION,
	AGENT_PLAN_TOOL_NAMES,
	AgentPlanValidationError,
	agentPlanDocumentSchema,
	agentPlanGroupSchema,
	agentPlanTaskSchema,
	type AgentPlanDocument,
	type AgentPlanItem,
	type AgentPlanTask,
} from './agent-plan.schema';
import { isFinal } from './agent-plan.validation';

const itemId = z.union([
	z.string().uuid().toLowerCase(),
	z
		.string()
		.regex(/^new:[A-Za-z0-9_-]+$/, 'Use a temporary ID such as new:research for new items.'),
]);

const itemFields = { id: itemId, dependsOn: z.array(itemId) };

const taskInput = agentPlanTaskSchema
	.omit({ startedAt: true, endedAt: true, jobId: true })
	.extend({ ...itemFields, fallbackFor: itemId.optional() });

const groupInput = agentPlanGroupSchema.omit({ startedAt: true, endedAt: true }).extend({
	...itemFields,
	status: agentPlanGroupSchema.shape.status.default('pending'),
	tasks: z.array(taskInput),
});

const documentInput = agentPlanDocumentSchema.extend({
	items: z.array(z.discriminatedUnion('kind', [taskInput, groupInput])),
});

const taskUpdate = taskInput.partial().required({ id: true }).extend({
	resultSummary: taskInput.shape.resultSummary.unwrap().nullable().optional(),
	fallbackFor: taskInput.shape.fallbackFor.unwrap().nullable().optional(),
});

const itemUpdate = taskUpdate.extend({
	kind: z.enum(['task', 'group']).optional(),
	tasks: z.array(taskUpdate).optional(),
});

const documentUpdate = documentInput.partial().extend({
	presentation: agentPlanDocumentSchema.shape.presentation
		.unwrap()
		.partial()
		.extend({
			detail: z.string().trim().min(1).nullable().optional(),
		})
		.nullable()
		.optional(),
	items: z.array(itemUpdate).optional(),
});

const writeInput = z
	.object({
		planId: z.string().uuid().toLowerCase(),
		expectedRevision: z.number().int().positive(),
	})
	.strict();

type AgentPlanDocumentInput = z.infer<typeof documentInput>;

function withoutManagedFields<Item extends AgentPlanItem>(item: Item) {
	const { startedAt, endedAt, ...visible } = item;

	if ('jobId' in visible) {
		const { jobId, ...definition } = visible;

		return definition;
	}

	return visible;
}

function mergeDocumentUpdate(
	previous: AgentPlanDocument,
	update: z.infer<typeof documentUpdate>,
	removeItemIds: string[],
): AgentPlanDocumentInput {
	const existing = new Map(
		previous.items
			.flatMap((item) => (item.kind === 'group' ? [item, ...item.tasks] : [item]))
			.map((item) => [item.id, item]),
	);

	const removed = new Set(removeItemIds);

	if (removed.size !== removeItemIds.length) {
		throw new AgentPlanValidationError('Removal IDs must be unique.');
	}

	for (const id of removeItemIds) {
		const item = existing.get(id);

		if (!item) throw new AgentPlanValidationError(`Unknown removal ID: ${id}`);

		if (item.kind === 'group') {
			for (const task of item.tasks) removed.add(task.id);
		}
	}

	const updated = new Set<string>();

	const mergeItems = (
		items: AgentPlanItem[],
		changes: Array<z.infer<typeof itemUpdate>>,
	): unknown[] => {
		const merged = new Map<string, unknown>();

		for (const item of items) {
			if (removed.has(item.id)) continue;

			merged.set(
				item.id,
				item.kind === 'group'
					? { ...withoutManagedFields(item), tasks: mergeItems(item.tasks, []) }
					: withoutManagedFields(item),
			);
		}

		for (const change of changes) {
			if (updated.has(change.id)) {
				throw new AgentPlanValidationError(`Duplicate update ID: ${change.id}`);
			}

			updated.add(change.id);

			if (removed.has(change.id)) {
				throw new AgentPlanValidationError(`Cannot update and remove the same item: ${change.id}`);
			}

			const current = items.find((item) => item.id === change.id);

			if (!current && !change.id.startsWith('new:')) {
				throw new AgentPlanValidationError(`Unknown item ID at this level: ${change.id}`);
			}

			if (current?.kind === 'group' && change.status !== undefined) {
				throw new AgentPlanValidationError(
					'Group statuses come from their tasks. Omit the group status.',
				);
			}

			const { tasks, ...fields } = change;
			const item = { ...(current ? withoutManagedFields(current) : {}), ...fields };

			if (item.resultSummary === null) delete item.resultSummary;

			if (item.fallbackFor === null) delete item.fallbackFor;

			merged.set(
				change.id,
				tasks !== undefined || item.kind === 'group'
					? {
							...item,
							tasks: mergeItems(current?.kind === 'group' ? current.tasks : [], tasks ?? []),
						}
					: item,
			);
		}

		return [...merged.values()];
	};

	const { items, presentation, ...fields } = update;
	const nextPresentation =
		presentation === null
			? undefined
			: {
					...previous.presentation,
					...presentation,
				};

	if (nextPresentation?.detail === null) delete nextPresentation.detail;

	return documentInput.parse({
		...previous,
		...fields,
		presentation: presentation === undefined ? previous.presentation : nextPresentation,
		items: mergeItems(previous.items, items ?? []),
	});
}

function prepareDocument(
	data: AgentPlanDocumentInput,
	previous?: AgentPlanDocument,
): AgentPlanDocument {
	const existing = new Map(
		previous?.items
			.flatMap((item) => (item.kind === 'group' ? [item, ...item.tasks] : [item]))
			.map((item) => [item.id, item]),
	);
	const aliases = new Map<string, string>();
	const items = data.items.flatMap((item) =>
		item.kind === 'group' ? [item, ...item.tasks] : [item],
	);

	for (const item of items) {
		if (item.id.startsWith('new:')) {
			if (aliases.has(item.id)) {
				throw new AgentPlanValidationError(`Duplicate temporary ID: ${item.id}`);
			}

			aliases.set(item.id, randomUUID());
		} else if (!existing.has(item.id)) {
			throw new AgentPlanValidationError(`Use a new: temporary ID for the new item: ${item.id}`);
		}
	}

	const resolveId = (id: string): string => {
		if (!id.startsWith('new:')) return id;

		const resolved = aliases.get(id);

		if (!resolved) throw new AgentPlanValidationError(`Unknown temporary ID: ${id}`);

		return resolved;
	};

	const restoreItem = (item: AgentPlanDocumentInput['items'][number]) => ({
		...item,
		id: resolveId(item.id),
		dependsOn: item.dependsOn.map(resolveId),
		startedAt: existing.get(item.id)?.startedAt ?? null,
		endedAt: existing.get(item.id)?.endedAt ?? null,
	});

	const restoreJob = (id: string) => {
		const item = existing.get(id);

		return item?.kind === 'task' && item.jobId ? { jobId: item.jobId } : {};
	};

	const restoreTask = (task: z.infer<typeof taskInput>) => ({
		...restoreItem(task),
		kind: task.kind,
		...restoreJob(task.id),
		...(task.fallbackFor !== undefined ? { fallbackFor: resolveId(task.fallbackFor) } : {}),
	});

	return {
		...data,
		items: data.items.map((item) =>
			item.kind === 'group'
				? { ...restoreItem(item), kind: item.kind, tasks: item.tasks.map(restoreTask) }
				: restoreTask(item),
		),
	};
}

function presentTask(task: AgentPlanTask) {
	const { startedAt, endedAt, ...visible } = task;

	return visible;
}

export function presentPlan(plan: AgentPlanSnapshot | null) {
	if (!plan) return null;

	const startedAt =
		plan.data.items
			.flatMap((item) => (item.kind === 'group' ? [item, ...item.tasks] : [item]))
			.map((item) => item.startedAt)
			.filter((timestamp): timestamp is string => timestamp !== null)
			.sort()[0] ?? null;

	const leaves = planLeaves(plan.data);
	const finishedAt =
		leaves.length > 0 && leaves.every((item) => isFinal(item.status))
			? (leaves
					.map((item) => item.endedAt)
					.filter((timestamp): timestamp is string => timestamp !== null)
					.sort()
					.at(-1) ?? null)
			: null;

	return {
		planId: plan.id,
		lastActivityAt:
			leaves
				.flatMap((item) => [item.startedAt, item.endedAt])
				.filter((time): time is string => time !== null)
				.sort()
				.at(-1) ?? null,
		revision: plan.revision,
		closed: plan.closedAt !== null,
		startedAt,
		finishedAt,
		closedAt: plan.closedAt?.toISOString() ?? null,
		document: {
			...plan.data,
			items: plan.data.items.map((item) =>
				item.kind === 'group'
					? { ...withoutManagedFields(item), tasks: item.tasks.map(presentTask) }
					: presentTask(item),
			),
		},
		readiness: plan.readiness,
	};
}

function scopedTool<Schema extends z.ZodType>(
	name: string,
	description: string,
	schema: Schema,
	handler: (
		input: z.output<Schema>,
		threadId: string,
		ctx: OperationContext,
	) => Promise<AgentPlanSnapshot | null>,
) {
	return new Tool(name)
		.description(description)
		.input(schema)
		.handler(async (input, context) => {
			const threadId = context.persistence?.threadId;
			if (!threadId) {
				return {
					error: 'unavailable',
					message: 'Plan tools need a persisted conversation thread.',
				};
			}

			try {
				return presentPlan(await handler(schema.parse(input), threadId, {}));
			} catch (error) {
				if (error instanceof AgentPlanWriteConflictError) {
					return {
						error: 'conflict',
						message:
							'The plan write conflicts with the stored state. Call read_plan before another write.',
					};
				}

				if (error instanceof AgentPlanValidationError || error instanceof z.ZodError) {
					return { error: 'invalid_plan', message: error.message };
				}

				throw error;
			}
		});
}

export function createAgentPlanTools(service: AgentPlanService): BuiltTool[] {
	return [
		scopedTool(
			AGENT_PLAN_TOOL_NAMES.create,
			'Create the active plan for this conversation. Use unique new: IDs for new tasks, groups, and dependencies. Set every task status to "pending" and omit group statuses. After creation, use update_plan for parent-run work or pass planTask when delegating ready work.',
			z.object({ document: documentInput }).strict(),
			async ({ document }, threadId, ctx) =>
				await service.createActivePlan(
					{
						id: randomUUID(),
						threadId,
						formatVersion: AGENT_PLAN_FORMAT_VERSION,
						data: prepareDocument(document),
					},
					ctx,
				),
		)
			.systemInstruction(
				'Use planning for multi-step, long-running, or dependency-heavy work (such as discovery, shortlisting, and parallel research). ' +
					'Create or update the plan before research, task tool calls, or sub-agent delegation; a chat message is not a plan. ' +
					'For quick work, keep the plan compact rather than skipping it. ' +
					'Always save new tasks with status "pending" and omit group statuses in create_plan and update_plan; never create items as "in_progress" or "done". ' +
					'Start or complete work only after prerequisites are "done". ' +
					'Never set a task to "paused"; paused tasks resume only via background_jobs(action: "resume") on an explicit user request. ' +
					'Update statuses only for tasks you perform yourself, including synthesis or comparison before your final reply. ' +
					'Delegated tasks (with jobId) take their status from their background job, and groups derive status from children; never set group or delegated task statuses. ' +
					'Wait for plan writes to succeed before announcing progress; on rejection, fix and retry. Call read_plan if the current plan or revision is not in context, after delegation (which advances the revision), or after a revision conflict. ' +
					'For update_plan, send only changed fields (id, status, changed title or resultSummary); nest child updates under their group id. ' +
					'Do not invent placeholder tasks for unknown scope (such as "Finalist 1/2/3"); use an empty pending group with dependencies and add concrete tasks once scope is known. ' +
					'Omit communication-only final tasks (such as "Present findings") unless they require a sub-agent or non-plan tool call. ' +
					'For plan sub-agent work, always call delegate_subagent with mode: "background" and planTask: { planId, planTaskId } (leaf task id), one job per task; never use foreground delegation for plan work (overrides default foreground guidance; if background mode is unavailable, explain the limitation). ' +
					'Card display: set presentation.label to a short factual current-activity label (not a completed-task list) and presentation.detail to one brief note, limitation, or approach change; save a final presentation.detail summary before close_plan. ' +
					'Keep titles short, clear, and non-repetitive (put shared context in parent titles; cards show titles, not descriptions—put constraints in description and findings in resultSummary). ' +
					'Use action verbs for active titles (e.g. "Research pricing (3 vendors)") and past tense when done (e.g. "Researched pricing"). ' +
					'Titles and resultSummary remain editable after completion; create a new task if a background result needs more work.',
			)
			.build(),
		scopedTool(
			AGENT_PLAN_TOOL_NAMES.read,
			'Read the active plan and its current revision for this conversation. Returns null if there is no active plan.',
			z.object({}).strict(),
			async (_input, threadId, ctx) => await service.findActivePlan(threadId, ctx),
		).build(),
		scopedTool(
			AGENT_PLAN_TOOL_NAMES.update,
			'Apply a partial update at expectedRevision. Send only changed fields; omitted fields and items stay unchanged. ' +
				'Merge items and group tasks by id; append new items with full fields and new: IDs (status "pending", omit group statuses and timestamps). ' +
				'Use removeItemIds to remove pending items. Set presentation, presentation.detail, resultSummary, or fallbackFor to null to clear; dependsOn replaces the saved list ([] clears). ' +
				'Dependencies connect siblings only; fallbackFor references a failed or cancelled sibling.',
			writeInput.extend({
				document: documentUpdate,
				removeItemIds: z.array(z.string().uuid().toLowerCase()).optional(),
			}),
			async ({ document, removeItemIds, ...input }, threadId, ctx) => {
				return await service.updatePlan(
					{ ...input, threadId, formatVersion: AGENT_PLAN_FORMAT_VERSION },
					(current) =>
						prepareDocument(mergeDocumentUpdate(current, document, removeItemIds ?? []), current),
					ctx,
				);
			},
		).build(),
		scopedTool(
			AGENT_PLAN_TOOL_NAMES.close,
			'Close the active plan at the expected revision. Preserve its document and release the active-plan slot. ' +
				'This does not cancel work or imply success.',
			writeInput,
			async (input, threadId, ctx) => await service.closePlan({ ...input, threadId }, ctx),
		).build(),
	];
}
