import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { IconBodyLoaderKey } from '@n8n/design-system';
import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { InstanceAiAgentNode, InstanceAiBackgroundInboxItem } from '@n8n/api-types';
import InstanceAiBackgroundTaskBar from '../components/InstanceAiBackgroundTaskBar.vue';

const storeState = reactive({
	messages: [] as Array<{ role: string; agentTree?: InstanceAiAgentNode }>,
	backgroundInbox: [] as InstanceAiBackgroundInboxItem[],
	sendTaskCorrection: vi.fn(async () => {}),
	sendBackgroundEventsNow: vi.fn(async () => {}),
	cancelBackgroundTask: vi.fn(async () => {}),
});

vi.mock('../instanceAi.store', () => ({
	useThread: vi.fn(() => storeState),
}));

const renderComponent = createComponentRenderer(InstanceAiBackgroundTaskBar, {
	pinia: createTestingPinia(),
	global: {
		provide: { [IconBodyLoaderKey as symbol]: async () => '<path d="M1 1"/>' },
	},
});

function browserAgent(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-browser-1',
		role: 'cloud-browser',
		taskId: 'browser-1',
		subtitle: 'Log in to the demo site',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function withBrowserAgent(agent: InstanceAiAgentNode) {
	storeState.messages = [
		{
			role: 'assistant',
			agentTree: { ...browserAgent(), agentId: 'root', role: 'orchestrator', children: [agent] },
		},
	];
}

describe('InstanceAiBackgroundTaskBar', () => {
	beforeEach(() => {
		storeState.messages = [];
		storeState.backgroundInbox = [];
		storeState.sendTaskCorrection.mockClear();
		storeState.sendBackgroundEventsNow.mockClear();
		storeState.cancelBackgroundTask.mockClear();
	});

	it('renders nothing without a background task', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-background-task-bar')).not.toBeInTheDocument();
	});

	it('stays hidden while a task just runs', () => {
		withBrowserAgent(browserAgent());

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-background-task-bar')).not.toBeInTheDocument();
	});

	it('shows a hand-off with the Live View link and hands back on "I\'m done"', async () => {
		withBrowserAgent(
			browserAgent({
				toolCalls: [
					{
						toolCallId: 'tc-1',
						toolName: 'request-user-action',
						args: { liveViewUrl: 'https://live.example/1', reason: 'Sign in to the site' },
						isLoading: true,
					},
				],
			}),
		);

		const { getByText, getByTestId } = renderComponent();

		expect(getByText('Cloud browser needs you')).toBeInTheDocument();
		expect(getByText('Sign in to the site')).toBeInTheDocument();
		expect(getByTestId('instance-ai-background-task-bar-live-view')).toHaveAttribute(
			'href',
			'https://live.example/1',
		);

		await fireEvent.click(getByTestId('instance-ai-background-task-bar-done'));
		expect(storeState.sendTaskCorrection).toHaveBeenCalledWith('browser-1', expect.any(String));
	});

	it('shows a queued result by task, with its outcome and no "Send now"', () => {
		withBrowserAgent(browserAgent({ status: 'completed', outcome: 'denied', result: '' }));
		storeState.backgroundInbox = [{ taskId: 'browser-1', kind: 'finished', sendNow: false }];

		const { getByText, queryByTestId } = renderComponent();

		expect(
			getByText(
				'Denied. The assistant will pick up the result when it finishes its current reply.',
			),
		).toBeInTheDocument();
		expect(queryByTestId('instance-ai-background-task-bar-send-now')).not.toBeInTheDocument();
	});

	it('hides a finished task once its result has reached the assistant', () => {
		withBrowserAgent(browserAgent({ status: 'completed', outcome: 'succeeded', result: 'ok' }));

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-background-task-bar')).not.toBeInTheDocument();
	});
});
