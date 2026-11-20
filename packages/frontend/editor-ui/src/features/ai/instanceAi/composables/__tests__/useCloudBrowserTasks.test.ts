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

function requestUserAction(
	args: Record<string, unknown>,
	isLoading = true,
): InstanceAiToolCallState {
	return { toolCallId: 'tc-request', toolName: 'browser_request_user_action', args, isLoading };
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
		expect(tasks.value[0].sessionKey).toBe('tc-1:0');

		runtime.messages[0].agentTree!.children[0].toolCalls = [
			startSession('tc-1'),
			{ toolCallId: 'tc-2', toolName: 'browser_navigate', args: {}, isLoading: false },
			startSession('tc-3'),
		];
		expect(tasks.value[0].sessionKey).toBe('tc-3:0');
	});

	it('changes the session key when the current window of the session changes', () => {
		const runtime = makeRuntime([makeNode({ toolCalls: [startSession('tc-1')] })]);
		const tasks = useCloudBrowserTasks(runtime);
		expect(tasks.value[0].sessionKey).toBe('tc-1:0');

		runtime.messages[0].agentTree!.children[0].cloudBrowserWindowChanges = 1;
		expect(tasks.value[0].sessionKey).toBe('tc-1:1');

		runtime.messages[0].agentTree!.children[0].cloudBrowserWindowChanges = 2;
		expect(tasks.value[0].sessionKey).toBe('tc-1:2');
	});

	it('has no session key before a session opens, even after a window change', () => {
		const tasks = useCloudBrowserTasks(makeRuntime([makeNode({ cloudBrowserWindowChanges: 1 })]));

		expect(tasks.value[0].sessionKey).toBe('');
	});

	describe('userAction', () => {
		it('takes the reason from the loading request call', () => {
			const tasks = useCloudBrowserTasks(
				makeRuntime([makeNode({ toolCalls: [requestUserAction({ reason: 'Log in, please' })] })]),
			);

			expect(tasks.value[0].userAction).toEqual({ reason: 'Log in, please' });
		});

		it('is not set when the request call finished', () => {
			const tasks = useCloudBrowserTasks(
				makeRuntime([
					makeNode({ toolCalls: [requestUserAction({ reason: 'Log in, please' }, false)] }),
				]),
			);

			expect(tasks.value[0].userAction).toBeUndefined();
		});

		it.each([
			['done', 'completed' as const],
			['failed', 'error' as const],
		])('is not set for a %s task', (_, status) => {
			const tasks = useCloudBrowserTasks(
				makeRuntime([
					makeNode({ status, toolCalls: [requestUserAction({ reason: 'Log in, please' })] }),
				]),
			);

			expect(tasks.value[0].userAction).toBeUndefined();
		});

		it.each([
			['a number', { reason: 42 }],
			['no reason', {}],
		])('is not set when the reason is %s', (_, args) => {
			const tasks = useCloudBrowserTasks(
				makeRuntime([makeNode({ toolCalls: [requestUserAction(args)] })]),
			);

			expect(tasks.value[0].userAction).toBeUndefined();
		});
	});
});
