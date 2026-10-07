import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { EXECUTION_METADATA_KEY } from '../types/agent-queued-message';
import type { AgentPlanOperationContext } from '../repositories/agent-plan.repository';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { AgentPlanService, AgentPlanSnapshot } from '../agent-plan.service';
import { AgentPlanWriteConflictError } from '../repositories/agent-plan.repository';
import {
	AGENT_PLAN_FORMAT_VERSION,
	AgentPlanValidationError,
	agentPlanDocumentSchema,
	agentPlanGroupSchema,
	agentPlanTaskSchema,
	type AgentPlanDocument,
	type AgentPlanItem,
} from './agent-plan.schema';

const itemId = z.union([
	z.string().uuid().toLowerCase(),
	z
		.string()
		.regex(/^new:[A-Za-z0-9_-]+$/, 'Use a temporary ID such as new:research for new items.'),
]);
const itemFields = { id: itemId, dependsOn: z.array(itemId) };
const taskInput = agentPlanTaskSchema
	.omit({ startedAt: true, endedAt: true })
	.extend({ ...itemFields, fallbackFor: itemId.optional() });
const groupInput = agentPlanGroupSchema
	.omit({ startedAt: true, endedAt: true })
	.extend({ ...itemFields, tasks: z.array(taskInput) });
const documentInput = agentPlanDocumentSchema.extend({
	items: z.array(z.discriminatedUnion('kind', [taskInput, groupInput])),
});
const writeInput = z
	.object({
		planId: z.string().uuid().toLowerCase(),
		expectedRevision: z.number().int().positive(),
	})
	.strict();

type AgentPlanDocumentInput = z.infer<typeof documentInput>;

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

	const restoreTask = (task: z.infer<typeof taskInput>) => ({
		...restoreItem(task),
		kind: task.kind,
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

export function presentPlan(plan: AgentPlanSnapshot | null) {
	if (!plan) return null;

	const startedAt =
		plan.data.items
			.flatMap((item) => (item.kind === 'group' ? [item, ...item.tasks] : [item]))
			.map((item) => item.startedAt)
			.filter((timestamp): timestamp is string => timestamp !== null)
			.sort()[0] ?? null;

	const withoutTiming = <Item extends AgentPlanItem>(item: Item) => {
		const { startedAt, endedAt, ...visible } = item;
		return visible;
	};

	return {
		planId: plan.id,
		revision: plan.revision,
		closed: plan.closedAt !== null,
		startedAt,
		closedAt: plan.closedAt?.toISOString() ?? null,
		document: {
			...plan.data,
			items: plan.data.items.map((item) =>
				item.kind === 'group'
					? { ...withoutTiming(item), tasks: item.tasks.map(withoutTiming) }
					: withoutTiming(item),
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
		ctx: AgentPlanOperationContext,
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
				return presentPlan(
					await handler(schema.parse(input), threadId, {
						sourceExecutionId:
							typeof context.persistence?.hostMetadata?.[EXECUTION_METADATA_KEY] === 'string'
								? context.persistence.hostMetadata[EXECUTION_METADATA_KEY]
								: undefined,
					}),
				);
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
			'create_plan',
			'Create the active plan for this conversation. Use unique new: names for new tasks and groups. ' +
				'Use these names in dependency references. Set every task and group status to "pending", including work you will start immediately. ' +
				'After creation succeeds, use update_plan with the returned permanent IDs and revision to start ready work.',
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
				'Use planning for potentially long-running work, work with multiple steps, or work with complex dependencies. ' +
					'For this work, create or update the plan before research, other task tool calls, or sub-agent delegation. ' +
					'Discovery followed by a shortlist and parallel research requires a plan. A chat message describing the steps is not a plan. ' +
					'If the user asks for quick work, keep the plan compact rather than skipping it. ' +
					'Always save new tasks and groups with status "pending", in both create_plan and update_plan. ' +
					'Do not create an item as "in_progress" or "done", even when work starts immediately or already finished. ' +
					'After the write succeeds, use the returned permanent IDs and revision in a separate update_plan call to change statuses. ' +
					'Only start or complete work after its prerequisites are Done. ' +
					'If later tasks depend on research results, start with the known tasks and extend the plan after research. ' +
					'Do not invent placeholder tasks for work whose scope or targets are not yet known. ' +
					'Represent that stage as a Pending group with an empty tasks list and dependencies on the prerequisite work. ' +
					'For example, add "Research finalists" without tasks named "Finalist 1", "Finalist 2", or "Finalist 3". ' +
					'After accepting the shortlist results, add concrete tasks to that group before starting the research. ' +
					'Do not add final communication-only tasks, such as "Presented findings to user", to the plan. ' +
					'Include such a task only when it requires a sub-agent or a tool call beyond plan maintenance. ' +
					'If the current plan content and revision are not in context, call read_plan before updating the plan. ' +
					'For sub-agent work on a plan task, always use spawn_background_subagent, even for short or sequential tasks. ' +
					'Do not use delegate_subagent for plan work. ' +
					'This rule overrides the default foreground-delegation guidance for plan work. ' +
					'If spawn_background_subagent is unavailable, explain the limitation instead of delegating plan work in the foreground. ' +
					'Keep task and group statuses current. Accept results before marking work Done. ' +
					'Before announcing plan changes or task progress to the user, always update the plan with that information. ' +
					'Wait for the plan update to succeed before announcing the change. ' +
					'Use presentation.label for a short, factual activity label in the plan card. ' +
					'Name the current activity in a few words, such as "Checking vendor pricing", not a list of completed tasks. ' +
					'Use presentation.detail for one brief progress note, limitation, or change of approach, not a results report. ' +
					'Keep task and group titles short. Each title must explain the work without its description. ' +
					'Avoid repeated words or phrases across task and group titles at the same nesting level when clarity permits. ' +
					'Put shared context in the parent title instead of repeating it in every child title. ' +
					'Keep each title distinct and clear. Do not replace repeated words with synonyms just for variety. ' +
					'Update titles of pending or in-progress tasks to reflect the current activity. The card shows titles, not task descriptions. ' +
					'For an in-progress task, use a simple action verb with a short note in parentheses, such as "Research pricing (3 vendors)". ' +
					'When marking a task Done, use a past-tense title, such as "Researched pricing". ' +
					'Save the completed title in the same update as the Done status. Final tasks cannot change. ' +
					'Put constraints in descriptions and findings in resultSummary. ' +
					'Keep this text current through update_plan. Presentation text does not set task or group statuses. ' +
					'Before closing a plan, save a final presentation.detail summary of completed and unfinished work. ' +
					'Underlying runs do not set plan statuses.',
			)
			.build(),
		scopedTool(
			'read_plan',
			'Read the active plan and its current revision for this conversation. Returns null if there is no active plan.',
			z.object({}).strict(),
			async (_input, threadId, ctx) => await service.findActivePlan(threadId, ctx),
		).build(),
		scopedTool(
			'update_plan',
			'Replace the complete active plan at the expected revision. Keep permanent IDs for existing items. ' +
				'Use new: names for new items and their references. Omit timestamps. ' +
				'Dependencies connect siblings only. Prerequisites must be done before work starts or completes. ' +
				'New tasks and groups must have status "pending". Change their statuses in a separate update after this write succeeds. ' +
				'Final items cannot change. Only pending items can be removed. ' +
				'fallbackFor references a failed or cancelled sibling task. Read the saved result for redirected dependencies.',
			writeInput.extend({ document: documentInput }),
			async ({ document, ...input }, threadId, ctx) => {
				const current = await service.findPlan(threadId, input.planId, ctx);
				if (!current || current.closedAt !== null || current.revision !== input.expectedRevision) {
					throw new AgentPlanWriteConflictError();
				}
				return await service.replacePlan(
					{
						...input,
						threadId,
						formatVersion: AGENT_PLAN_FORMAT_VERSION,
						data: prepareDocument(document, current.data),
					},
					ctx,
				);
			},
		).build(),
		scopedTool(
			'close_plan',
			'Close the active plan at the expected revision. Preserve its document and release the active-plan slot. ' +
				'This does not cancel work or imply success.',
			writeInput,
			async (input, threadId, ctx) => await service.closePlan({ ...input, threadId }, ctx),
		).build(),
	];
}
