import { z } from 'zod';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import {
	buildDisplayGroups,
	type DisplayGroup,
} from '@/features/ai/shared/agentsChat/displayGroups';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '../constants';

const itemFields = {
	id: z.string().uuid(),
	title: z.string().min(1),
	description: z.string().optional(),
	resultSummary: z.string().optional(),
	status: z.enum(['pending', 'in_progress', 'done', 'failed', 'cancelled']),
};
const taskSchema = z.object({ ...itemFields, kind: z.literal('task') });
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

const comparisonDocumentSchema = planSchema.shape.document.passthrough().extend({
	items: z.array(
		z.discriminatedUnion('kind', [
			taskSchema.passthrough(),
			groupSchema.passthrough().extend({ tasks: z.array(taskSchema.passthrough()) }),
		]),
	),
});
const comparisonPlanSchema = planSchema.extend({ document: comparisonDocumentSchema });
const updateInputSchema = z.object({
	planId: z.string().uuid(),
	expectedRevision: z.number().int().positive(),
	document: comparisonDocumentSchema,
});
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

export function buildAgentPlanDisplayGroups(messages: ChatMessage[]): DisplayGroup[] {
	const plans = new Map<string, Map<number, z.infer<typeof comparisonPlanSchema>>>();
	const hiddenCalls = new Set<string>();
	for (const message of messages) {
		for (const call of message.toolCalls ?? []) {
			if (!planToolNames.has(call.tool)) continue;
			hiddenCalls.delete(call.toolCallId);
			if (call.canceled) continue;
			if (call.state === TOOL_CALL_STATE.DONE) {
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
				(call.state === TOOL_CALL_STATE.PENDING || call.state === TOOL_CALL_STATE.RUNNING)
			) {
				const input = updateInputSchema.safeParse(call.input);
				if (!input.success) continue;
				const previous = plans.get(input.data.planId)?.get(input.data.expectedRevision);
				if (
					previous &&
					!previous.closed &&
					isEqual(planSubstance(previous.document), planSubstance(input.data.document))
				) {
					hiddenCalls.add(call.toolCallId);
				}
			}
		}
	}
	return buildDisplayGroups(messages).flatMap((group): DisplayGroup[] => {
		if (group.kind === 'backgroundJobSignal') return [group];
		if (group.kind === 'message') {
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
			!toolCalls.length &&
			!group.active &&
			!group.finalMessage?.content.trim() &&
			!group.finalMessage?.attachments?.length &&
			!group.finalMessage?.renderParts?.length &&
			!group.thinkingSegments.length &&
			!group.interactives.length
		) {
			return [];
		}
		return [{ ...group, toolCalls }];
	});
}

export function selectLatestAgentPlan(messages: ChatMessage[]): AgentPlanView | null {
	const plans = new Map<string, AgentPlanView>();
	let current: AgentPlanView | null = null;
	for (const message of messages) {
		for (const call of message.toolCalls ?? []) {
			if (!planToolNames.has(call.tool) || call.state !== TOOL_CALL_STATE.DONE || call.canceled) {
				continue;
			}
			if (call.tool === 'read_plan' && call.output === null) {
				current = null;
				plans.clear();
				continue;
			}
			const result = planSchema.safeParse(call.output);
			if (!result.success) continue;
			const previous = plans.get(result.data.planId);
			current = previous && previous.revision >= result.data.revision ? previous : result.data;
			plans.set(current.planId, current);
		}
	}
	return current;
}
