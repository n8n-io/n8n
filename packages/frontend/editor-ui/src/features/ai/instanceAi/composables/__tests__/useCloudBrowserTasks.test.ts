import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { reactive } from 'vue';

import type { ThreadRuntime } from '../../instanceAi.store';
import { useCloudBrowserTasks } from '../useCloudBrowserTasks';

function makeNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'cloud-browser',
		kind: 'cloud-browser',
		status: 'active',
		taskId: 'task-1',
		title: 'Find the price',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function startSession(toolCallId: string, isLoading = false): InstanceAiToolCallState {
	return { toolCallId, toolName: 'browser_start_session', args: {}, isLoading };
}

function makeRuntime(...children: InstanceAiAgentNode[][]) {
	return reactive({
		messages: children.map((turn, index) => ({
			id: `msg-${index}`,
			role: 'assistant',
			agentTree: makeNode({
				agentId: `orchestrator-${index}`,
				role: 'orchestrator',
				kind: undefined,
				taskId: undefined,
				status: 'completed',
				children: turn,
			}),
		})),
	}) as unknown as ThreadRuntime;
}

describe('useCloudBrowserTasks', () => {
	it('lists the browser tasks of every turn, oldest first', () => {
		const runtime = makeRuntime(
			[makeNode({ agentId: 'agent-1', taskId: 'task-1', title: 'First' })],
			[makeNode({ agentId: 'agent-2', taskId: 'task-2', title: 'Second' })],
		);

		const tasks = useCloudBrowserTasks(runtime);

		expect(tasks.value.map((task) => task.title)).toEqual(['First', 'Second']);
	});

	it.each([
		['running', { status: 'active' as const }],
		['done', { status: 'completed' as const }],
		['failed', { status: 'error' as const }],
	])('shows a %s task', (state, overrides) => {
		const tasks = useCloudBrowserTasks(makeRuntime([makeNode(overrides)]));

		expect(tasks.value[0].state).toBe(state);
	});

	it.each([
		['a task whose result was delivered', { status: 'completed' as const, resultDelivered: true }],
		['a stopped task', { status: 'cancelled' as const }],
		['an agent with no task id', { taskId: undefined }],
		['an agent that is not a browser agent', { kind: 'builder' as const }],
	])('leaves out %s', (_, overrides) => {
		const tasks = useCloudBrowserTasks(makeRuntime([makeNode(overrides)]));

		expect(tasks.value).toEqual([]);
	});

	it('changes the session key each time the agent opens a session', () => {
		const node = makeNode({ toolCalls: [startSession('tc-1', true)] });
		const runtime = makeRuntime([node]);
		const tasks = useCloudBrowserTasks(runtime);
		expect(tasks.value[0].sessionKey).toBe('');

		runtime.messages[0].agentTree!.children[0].toolCalls = [startSession('tc-1')];
		expect(tasks.value[0].sessionKey).toBe('tc-1');

		runtime.messages[0].agentTree!.children[0].toolCalls = [
			startSession('tc-1'),
			{ toolCallId: 'tc-2', toolName: 'browser_navigate', args: {}, isLoading: false },
			startSession('tc-3'),
		];
		expect(tasks.value[0].sessionKey).toBe('tc-3');
	});
});
