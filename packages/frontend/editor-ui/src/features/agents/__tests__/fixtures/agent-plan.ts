import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import type { AgentPlanItemStatus, AgentPlanView } from '../../utils/agent-plan';

export function planTask(index: number, status: AgentPlanItemStatus = 'pending') {
	return {
		id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
		kind: 'task' as const,
		title: `Task ${index}`,
		status,
	};
}

export function planView(overrides: Partial<AgentPlanView> = {}): AgentPlanView {
	return {
		planId: '11111111-1111-4111-8111-111111111111',
		revision: 1,
		closed: false,
		document: {
			title: 'Compare support platforms',
			items: [
				planTask(1),
				{
					...planTask(10, 'in_progress'),
					kind: 'group',
					title: 'Research',
					tasks: [planTask(2, 'done'), planTask(3)],
				},
			],
		},
		...overrides,
	};
}

let nextMessageId = 0;

export function planMessage(output: unknown, overrides: Partial<ToolCall> = {}): ChatMessage {
	const id = ++nextMessageId;
	return {
		id: `assistant-${id}`,
		role: 'assistant',
		content: '',
		toolCalls: [
			{ tool: 'create_plan', toolCallId: `plan-call-${id}`, state: 'done', output, ...overrides },
		],
	};
}
