import { fireEvent } from '@testing-library/vue';
import { computed, reactive } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { CloudBrowserLiveView } from '../../composables/useCloudBrowserLiveViews';
import { CloudBrowserLiveViewsKey } from '../../composables/useCloudBrowserLiveViews';
import {
	CloudBrowserTasksKey,
	type CloudBrowserTask,
} from '../../composables/useCloudBrowserTasks';
import InstanceAiCloudBrowsersCard from '../InstanceAiCloudBrowsersCard.vue';

const { thread } = vi.hoisted(() => ({ thread: { cancelBackgroundTask: vi.fn() } }));
vi.mock('../../instanceAi.store', () => ({ useThread: () => thread }));

const renderComponent = createComponentRenderer(InstanceAiCloudBrowsersCard);

function makeTask(overrides: Partial<CloudBrowserTask> = {}): CloudBrowserTask {
	return {
		agentId: 'agent-1',
		taskId: 'task-1',
		title: 'Find the price',
		state: 'running',
		sessionKey: '',
		...overrides,
	};
}

function render(
	task: CloudBrowserTask,
	view?: CloudBrowserLiveView,
	openCloudBrowserTab?: (taskId: string) => void,
) {
	const liveViews = reactive(new Map<string, CloudBrowserLiveView>());
	if (view) liveViews.set(task.taskId, view);
	return renderComponent({
		global: {
			provide: {
				[CloudBrowserTasksKey as symbol]: computed(() => [task]),
				[CloudBrowserLiveViewsKey as symbol]: liveViews,
				openCloudBrowserTab,
			},
		},
	});
}

describe('InstanceAiCloudBrowsersCard', () => {
	beforeEach(() => {
		thread.cancelBackgroundTask.mockReset();
	});

	it('shows nothing when no browser task runs', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-cloud-browsers')).not.toBeInTheDocument();
	});

	it.each([
		['while the live view loads', { status: 'loading' as const }],
		['while the browser starts', { status: 'starting' as const }],
		['before the agent opens a session', { status: 'no-session' as const }],
	])('says the browser is opening %s', (_, view) => {
		const { getByTestId } = render(makeTask(), view);

		expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent(
			'Opening the browser…',
		);
	});

	it('shows the live view of a running browser', () => {
		const { getByTestId, container } = render(makeTask(), {
			status: 'live',
			liveViewUrl: 'https://live.example.com/1',
			windowId: 'window-1',
		});

		expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent('Working');
		expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
			'https://live.example.com/1?navbar=false',
		);
		expect(container.querySelector('iframe')?.getAttribute('data-cloud-browser-task-id')).toBe(
			'task-1',
		);
		expect(container.querySelector('iframe')?.getAttribute('data-cloud-browser-window-id')).toBe(
			'window-1',
		);
	});

	it('says when the browser closed', () => {
		const { getByTestId, container } = render(makeTask(), {
			status: 'disconnected',
			reason: 'idleTimeout',
		});

		expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent('The browser closed');
		expect(container.querySelector('iframe')).toBeNull();
	});

	it('hides a running task the instance no longer runs', () => {
		const { queryByTestId } = render(makeTask(), { status: 'not-found' });

		expect(queryByTestId('instance-ai-cloud-browser-row')).not.toBeInTheDocument();
	});

	it.each([
		['done', 'Done · the result appears after this reply'],
		['failed', 'Failed · details appear after this reply'],
	] as const)('keeps a %s task until its result is delivered', (state, text) => {
		const { getByTestId, queryByTestId } = render(makeTask({ state }), { status: 'not-found' });

		expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent(text);
		expect(queryByTestId('instance-ai-cloud-browser-stop')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-cloud-browser-live-view')).not.toBeInTheDocument();
	});

	it('stops a running task', async () => {
		const { getByTestId } = render(makeTask(), { status: 'no-session' });

		await fireEvent.click(getByTestId('instance-ai-cloud-browser-stop'));

		expect(thread.cancelBackgroundTask).toHaveBeenCalledWith('task-1');
	});

	it('says the task needs the user while it waits for them', () => {
		const { getByTestId } = render(makeTask({ userAction: { reason: 'Log in, please' } }), {
			status: 'live',
			liveViewUrl: 'https://live.example.com/1',
			windowId: 'window-1',
			userInControl: true,
		});

		expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent('Needs you');
	});

	it('says the user has control after they took over', () => {
		const { getByTestId } = render(makeTask(), {
			status: 'live',
			liveViewUrl: 'https://live.example.com/1',
			windowId: 'window-1',
			userInControl: true,
		});

		expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent(
			'You have control of the browser',
		);
	});

	it('opens the browser tab when the user clicks the live view', async () => {
		const openCloudBrowserTab = vi.fn();
		const { getByTestId, container } = render(
			makeTask(),
			{ status: 'live', liveViewUrl: 'https://live.example.com/1', windowId: 'window-1' },
			openCloudBrowserTab,
		);

		await fireEvent.click(getByTestId('instance-ai-cloud-browser-open'));

		expect(openCloudBrowserTab).toHaveBeenCalledWith('task-1');
		// The frame sits next to the button: a button cannot hold an iframe.
		expect(container.querySelector('button iframe')).toBeNull();
	});
});
