import { z } from 'zod';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '../constants';

const itemFields = {
	id: z.string().uuid(),
	title: z.string().min(1),
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
	document: z.object({
		title: z.string().min(1),
		items: z.array(z.discriminatedUnion('kind', [taskSchema, groupSchema])),
	}),
});
const planToolNames = new Set(['create_plan', 'read_plan', 'update_plan', 'close_plan']);

export type AgentPlanView = z.infer<typeof planSchema>;
export type AgentPlanItemStatus = AgentPlanView['document']['items'][number]['status'];

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
