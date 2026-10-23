import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { CloudBrowserTask } from '../../composables/useCloudBrowserTasks';
import InstanceAiCloudBrowserUserActionPanel from '../InstanceAiCloudBrowserUserActionPanel.vue';

const { tasks } = vi.hoisted(() => ({
	tasks: { value: [] as CloudBrowserTask[] },
}));
vi.mock('../../composables/useCloudBrowserTasks', () => ({ useCloudBrowserTasks: () => tasks }));

const renderComponent = createComponentRenderer(InstanceAiCloudBrowserUserActionPanel);

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

function render(taskList: CloudBrowserTask[], openCloudBrowserTab?: (taskId: string) => void) {
	tasks.value = taskList;
	return renderComponent({ global: { provide: { openCloudBrowserTab } } });
}

describe('InstanceAiCloudBrowserUserActionPanel', () => {
	it('shows nothing when no task waits for the user', () => {
		const { queryByTestId } = render([makeTask(), makeTask({ taskId: 'task-2' })]);

		expect(queryByTestId('instance-ai-cloud-browser-take-over')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-cloud-browser-user-action-panel')).not.toBeInTheDocument();
	});

	it('shows one "Browser" row for each task that waits for the user', () => {
		const { getAllByTestId, getAllByText } = render([
			makeTask({ taskId: 'task-1', userAction: { reason: 'Log in, please' } }),
			makeTask({ taskId: 'task-2' }),
			makeTask({ taskId: 'task-3', userAction: { reason: 'Solve the captcha' } }),
		]);

		expect(getAllByTestId('instance-ai-cloud-browser-take-over')).toHaveLength(2);
		expect(getAllByText('Browser')).toHaveLength(2);
	});

	it('opens the browser tab of the task when the user clicks "Take over"', async () => {
		const openCloudBrowserTab = vi.fn();
		const { getAllByTestId } = render(
			[
				makeTask({ taskId: 'task-1' }),
				makeTask({ taskId: 'task-2', userAction: { reason: 'Log in, please' } }),
			],
			openCloudBrowserTab,
		);

		await fireEvent.click(getAllByTestId('instance-ai-cloud-browser-take-over')[0]);

		expect(openCloudBrowserTab).toHaveBeenCalledWith('task-2');
	});
});
