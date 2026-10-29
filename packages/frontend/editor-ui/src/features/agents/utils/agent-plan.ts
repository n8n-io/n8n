import { z } from 'zod';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import {
	buildDisplayGroups,
	DISPLAY_GROUP_KIND,
	type DisplayGroup,
} from '@/features/ai/shared/agentsChat/displayGroups';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '../constants';

const itemFields = {
	id: z.string().uuid(),
	title: z.string().min(1),
	description: z.string().optional(),
	resultSummary: z.string().optional(),
	status: z.enum(['pending', 'in_progress', 'paused', 'done', 'failed', 'cancelled']),
};
const taskSchema = z.object({
	...itemFields,
	kind: z.literal('task'),
	jobId: z.string().uuid().optional(),
});
const groupSchema = z.object({
	...itemFields,
	kind: z.literal('group'),
	tasks: z.array(taskSchema),
});
const planSchema = z.object({
	planId: z.string().uuid(),
	revision: z.number().int().positive(),
	closed: z.boolean(),
	startedAt: z.string().datetime().nullable().optional(),
	lastActivityAt: z.string().datetime().nullable().optional(),
	finishedAt: z.string().datetime().nullable().optional(),
	closedAt: z.string().datetime().nullable().optional(),
	document: z.object({
		title: z.string().min(1),
		presentation: z
			.object({ label: z.string().trim().min(1), detail: z.string().trim().min(1).optional() })
			.optional(),
		items: z.array(z.discriminatedUnion('kind', [taskSchema, groupSchema])),
	}),
});
const planToolNames = new Set(['create_plan', 'read_plan', 'update_plan', 'close_plan']);
const planErrorSchema = z.union([z.string(), z.object({ error: z.string() })]);

export function isRecoverablePlanError(call: ToolCall): boolean {
	if (
		!planToolNames.has(call.tool) ||
		call.tool === 'read_plan' ||
		call.canceled ||
		(call.state !== TOOL_CALL_STATE.ERROR && call.state !== TOOL_CALL_STATE.DONE)
	) {
		return false;
	}

	const result = planErrorSchema.safeParse(call.output);
	if (!result.success) return false;
	if (typeof result.data !== 'string' && ['invalid_plan', 'conflict'].includes(result.data.error)) {
		return true;
	}
	if (call.state !== TOOL_CALL_STATE.ERROR) return false;
	const message = typeof result.data === 'string' ? result.data : result.data.error;
	return message
		.replace(/^Error: /, '')
		.startsWith(`AI_InvalidToolInputError: Invalid input for tool ${call.tool}:`);
}

export type AgentPlanView = z.infer<typeof planSchema>;
export type AgentPlanItemStatus = AgentPlanView['document']['items'][number]['status'];

/** Lists the tasks that count for plan progress. A group without tasks counts as one task. */
export function getAgentPlanTasks(plan: AgentPlanView) {
	return plan.document.items.flatMap((item) =>
		item.kind === 'group' && item.tasks.length ? item.tasks : [item],
	);
}

export function isAgentPlanFinished(plan: AgentPlanView): boolean {
	const tasks = getAgentPlanTasks(plan);

	return (
		plan.closed ||
		(tasks.length > 0 &&
			tasks.every((item) => ['done', 'failed', 'cancelled'].includes(item.status)))
	);
}

/** Live messages can arrive before the execution ID. Keep one key for their turn. */
function messageTurnIds(messages: ChatMessage[]): Map<string, string> {
	const ids = new Map<string, string>();
	let turn: ChatMessage[] = [];
	let executionId: string | undefined;

	const flush = () => {
		const key = executionId ?? turn[0]?.id;

		if (key) for (const message of turn) ids.set(message.id, key);

		turn = [];
		executionId = undefined;
	};

	for (const message of messages) {
		if (message.role !== 'assistant' || message.stopReport) {
			flush();

			continue;
		}

		if (executionId && message.executionId && executionId !== message.executionId) flush();

		turn.push(message);
		executionId ??= message.executionId;
	}

	flush();

	return ids;
}

const backgroundJobReceiptSchema = z.object({
	jobId: z.string(),
	status: z.enum(['started', 'running_in_background']),
});

function taskSummaryTurnIds(messages: ChatMessage[], turnIds: Map<string, string>): Set<string> {
	const executions = new Set<string>();
	const continued = new Set<string>();

	for (const message of messages) {
		const key = turnIds.get(message.id);

		if (!key) continue;

		if (message.backgroundJobSignal?.isFinal) executions.add(key);

		for (const call of message.toolCalls ?? []) {
			if (call.state !== TOOL_CALL_STATE.DONE || call.canceled) continue;

			if (backgroundJobReceiptSchema.safeParse(call.output).success) continued.add(key);

			if (!planToolNames.has(call.tool)) continue;

			const plan = planSchema.safeParse(call.output);

			if (!plan.success) continue;

			if (!isAgentPlanFinished(plan.data)) executions.delete(key);
			else if (['update_plan', 'close_plan'].includes(call.tool)) executions.add(key);
		}
	}

	// A result turn can start the next batch instead of summarizing the work.
	for (const key of continued) executions.delete(key);

	return executions;
}

/** Put one summary at the end of each task result turn, including saved turns. */
export function getTaskSummaryGroupIds(
	messages: ChatMessage[],
	groups: DisplayGroup[],
): Set<string> {
	const turnIds = messageTurnIds(messages);

	return lastSummaryGroupIds(groups, turnIds, taskSummaryTurnIds(messages, turnIds));
}

function lastSummaryGroupIds(
	groups: DisplayGroup[],
	turnIds: Map<string, string>,
	executions: Set<string>,
): Set<string> {
	const lastGroups = new Map<string, string>();

	for (const group of groups) {
		const key = turnIds.get(group.id);

		if (key && executions.has(key)) lastGroups.set(key, group.id);
	}

	return new Set(lastGroups.values());
}

const comparisonDocumentSchema = planSchema.shape.document.passthrough().extend({
	items: z.array(
		z.discriminatedUnion('kind', [
			taskSchema.passthrough(),
			groupSchema.passthrough().extend({ tasks: z.array(taskSchema.passthrough()) }),
		]),
	),
});
const comparisonPlanSchema = planSchema.extend({ document: comparisonDocumentSchema });
const taskUpdateSchema = taskSchema.partial().required({ id: true }).passthrough().extend({
	resultSummary: z.string().nullable().optional(),
});
const itemUpdateSchema = taskUpdateSchema.extend({
	kind: z.enum(['task', 'group']).optional(),
	tasks: z.array(taskUpdateSchema).optional(),
});
const updateInputSchema = z
	.object({
		planId: z.string().uuid(),
		expectedRevision: z.number().int().positive(),
		document: comparisonDocumentSchema.partial().extend({
			presentation: planSchema.shape.document.shape.presentation
				.unwrap()
				.partial()
				.extend({ detail: z.string().trim().min(1).nullable().optional() })
				.strict()
				.nullable()
				.optional(),
			items: z.array(itemUpdateSchema).optional(),
		}),
		removeItemIds: z.array(z.string().uuid()).optional(),
	})
	.strict();
const progressFields = ['title', 'status', 'resultSummary', 'startedAt', 'endedAt'];

function planSubstance(document: z.infer<typeof comparisonDocumentSchema>) {
	return {
		...omit(document, ['presentation', 'items']),
		items: document.items.map((item) => ({
			...omit(item, progressFields),
			...(item.kind === 'group'
				? { tasks: item.tasks.map((task) => omit(task, progressFields)) }
				: {}),
		})),
	};
}

function itemsHaveOnlyProgressUpdates(
	items: z.infer<typeof comparisonDocumentSchema>['items'],
	updates: Array<z.infer<typeof itemUpdateSchema>>,
): boolean {
	const previousItems = new Map(items.map((item) => [item.id, item]));
	const updatedIds = new Set<string>();
	return updates.every((update) => {
		const previous = previousItems.get(update.id);
		if (!previous || updatedIds.has(update.id)) return false;
		updatedIds.add(update.id);
		if (
			!Object.entries(omit(update, [...progressFields, 'tasks'])).every(([field, value]) =>
				isEqual(previous[field], value),
			)
		) {
			return false;
		}
		return (
			update.tasks === undefined ||
			(previous.kind === 'group' && itemsHaveOnlyProgressUpdates(previous.tasks, update.tasks))
		);
	});
}

function isProgressUpdate(
	previous: z.infer<typeof comparisonDocumentSchema>,
	update: z.infer<typeof updateInputSchema>,
): boolean {
	return (
		!update.removeItemIds?.length &&
		Object.entries(omit(update.document, ['presentation', 'items'])).every(([field, value]) =>
			isEqual(previous[field], value),
		) &&
		itemsHaveOnlyProgressUpdates(previous.items, update.document.items ?? [])
	);
}

export function buildAgentPlanDisplayGroups(messages: ChatMessage[]): DisplayGroup[] {
	const plans = new Map<string, Map<number, z.infer<typeof comparisonPlanSchema>>>();
	const hiddenCalls = new Set<string>();
	for (const message of messages) {
		for (const call of message.toolCalls ?? []) {
			if (!planToolNames.has(call.tool)) continue;

			hiddenCalls.delete(call.toolCallId);
			if (call.canceled) continue;

			if (call.state === TOOL_CALL_STATE.DONE && call.output !== undefined) {
				if (call.tool === 'read_plan' && call.output === null) plans.clear();

				const result = comparisonPlanSchema.safeParse(call.output);
				if (!result.success) continue;

				const current = result.data;
				const revisions =
					plans.get(current.planId) ?? new Map<number, z.infer<typeof comparisonPlanSchema>>();
				const previous = revisions.get(current.revision - 1);

				if (
					call.tool === 'update_plan' &&
					previous &&
					!previous.closed &&
					!current.closed &&
					isEqual(planSubstance(previous.document), planSubstance(current.document))
				) {
					hiddenCalls.add(call.toolCallId);
				}

				revisions.set(current.revision, current);
				plans.set(current.planId, revisions);
			} else if (
				call.tool === 'update_plan' &&
				(call.state === TOOL_CALL_STATE.PENDING ||
					call.state === TOOL_CALL_STATE.RUNNING ||
					(call.state === TOOL_CALL_STATE.DONE && call.output === undefined))
			) {
				const input = updateInputSchema.safeParse(call.input);
				if (!input.success) continue;

				const previous = plans.get(input.data.planId)?.get(input.data.expectedRevision);

				if (previous && !previous.closed && isProgressUpdate(previous.document, input.data)) {
					hiddenCalls.add(call.toolCallId);
				}
			}
		}
	}

	const turnIds = messageTurnIds(messages);
	const summaryTurns = taskSummaryTurnIds(messages, turnIds);
	const groups = buildDisplayGroups(
		messages.map((message) =>
			message.backgroundJobSignal?.isFinal && summaryTurns.has(turnIds.get(message.id) ?? '')
				? { ...message, backgroundJobSignal: undefined }
				: message,
		),
	);
	const summaryGroupIds = lastSummaryGroupIds(groups, turnIds, summaryTurns);

	return groups.flatMap((group): DisplayGroup[] => {
		if (group.kind === DISPLAY_GROUP_KIND.BACKGROUND_JOB_SIGNAL) return [group];
		if (group.kind === DISPLAY_GROUP_KIND.MESSAGE) {
			return [
				{
					...group,
					message: {
						...group.message,
						toolCalls: group.message.toolCalls?.filter((call) => !hiddenCalls.has(call.toolCallId)),
					},
				},
			];
		}

		const toolCalls = group.toolCalls.filter((call) => !hiddenCalls.has(call.toolCallId));

		if (
			!summaryGroupIds.has(group.id) &&
			!toolCalls.length &&
			!group.active &&
			!group.finalMessage?.content.trim() &&
			!group.finalMessage?.attachments?.length &&
			!group.finalMessage?.renderParts?.length &&
			!group.thinkingSegments.length &&
			!group.budgetNotices.length &&
			!group.interactives.length &&
			!group.hostEvents?.length
		) {
			return [];
		}

		return [{ ...group, toolCalls }];
	});
}
