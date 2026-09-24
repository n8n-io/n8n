import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { OperationContext } from '@n8n/db';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { AgentPlanService } from '../agent-plan.service';
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

type ToolDocument = z.infer<typeof documentInput>;
type StoredPlan = NonNullable<Awaited<ReturnType<AgentPlanService['findActivePlan']>>>;

function prepareDocument(data: ToolDocument, previous?: AgentPlanDocument): AgentPlanDocument {
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
	const restoreItem = (item: ToolDocument['items'][number]) => ({
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

function presentPlan(plan: StoredPlan | null) {
	if (!plan) return null;
	const withoutTiming = <Item extends AgentPlanItem>(item: Item) => {
		const { startedAt, endedAt, ...visible } = item;
		return visible;
	};
	return {
		planId: plan.id,
		revision: plan.revision,
		closed: plan.closedAt !== null,
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
		ctx: OperationContext,
	) => Promise<StoredPlan | null>,
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
			'create_plan',
			'Create the active plan for this conversation. Use unique new: names for new tasks and groups. ' +
				'Use these names in dependency references. New items must be pending. The result contains permanent IDs.',
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
					'If the current plan content and revision are not in context, call read_plan before updating the plan. ' +
					'Keep task and group statuses current. Accept results before marking work Done. ' +
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
