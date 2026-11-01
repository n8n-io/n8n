import { mount } from '@vue/test-utils';
import { computed, defineComponent, nextTick, reactive, ref } from 'vue';

import { CloudBrowserTasksKey, type CloudBrowserTask } from '../useCloudBrowserTasks';
import { useStopBrowserTasksPrompt } from '../useStopBrowserTasksPrompt';

function makeTask(overrides: Partial<CloudBrowserTask> = {}): CloudBrowserTask {
	return {
		agentId: 'agent-1',
		taskId: 'task-1',
		title: 'Find the price',
		state: 'running',
		sessionKey: 'tc-1',
		...overrides,
	};
}

/** Runs the composable in a component, the way the conversation does. `null` provides no task list. */
function setup(initial: CloudBrowserTask[] | null) {
	const tasks = ref(initial ?? []);
	const thread = reactive({
		id: 'thread-1',
		isStreaming: false,
		cancelBackgroundTask: vi.fn().mockResolvedValue(undefined),
	});
	let prompt!: ReturnType<typeof useStopBrowserTasksPrompt>;
	mount(
		defineComponent({
			setup() {
				prompt = useStopBrowserTasksPrompt(thread);
				return () => null;
			},
		}),
		{
			global: {
				provide: initial ? { [CloudBrowserTasksKey]: computed(() => tasks.value) } : {},
			},
		},
	);
	return { tasks, thread, prompt };
}

describe('useStopBrowserTasksPrompt', () => {
	it('opens after a stop when browser tasks still run', () => {
		const { prompt } = setup([makeTask(), makeTask({ taskId: 'task-2' })]);

		prompt.openIfTasksRunning();

		expect(prompt.isOpen.value).toBe(true);
		expect(prompt.runningCount.value).toBe(2);
	});

	it('stays closed when no task runs', () => {
		const { prompt } = setup([makeTask({ state: 'done' })]);

		prompt.openIfTasksRunning();

		expect(prompt.isOpen.value).toBe(false);
		expect(prompt.runningCount.value).toBe(0);
	});

	it('stays closed outside a thread, where no task list is provided', () => {
		const { prompt } = setup(null);

		prompt.openIfTasksRunning();

		expect(prompt.isOpen.value).toBe(false);
	});

	it('stops only the tasks that still run, then closes', () => {
		const { thread, prompt } = setup([
			makeTask({ taskId: 'task-1' }),
			makeTask({ taskId: 'task-2', state: 'done' }),
			makeTask({ taskId: 'task-3' }),
		]);
		prompt.openIfTasksRunning();

		prompt.stopTasks();

		expect(thread.cancelBackgroundTask).toHaveBeenCalledTimes(2);
		expect(thread.cancelBackgroundTask).toHaveBeenCalledWith('task-1');
		expect(thread.cancelBackgroundTask).toHaveBeenCalledWith('task-3');
		expect(prompt.isOpen.value).toBe(false);
	});

	it('closes without stopping anything when the user keeps the tasks running', () => {
		const { thread, prompt } = setup([makeTask()]);
		prompt.openIfTasksRunning();

		prompt.close();

		expect(prompt.isOpen.value).toBe(false);
		expect(thread.cancelBackgroundTask).not.toHaveBeenCalled();
	});

	it('closes when the last task stops running', async () => {
		const { tasks, prompt } = setup([makeTask()]);
		prompt.openIfTasksRunning();

		tasks.value = [makeTask({ state: 'done' })];
		await nextTick();

		expect(prompt.isOpen.value).toBe(false);
	});

	it('closes when the user switches threads', async () => {
		const { thread, prompt } = setup([makeTask()]);
		prompt.openIfTasksRunning();

		thread.id = 'thread-2';
		await nextTick();

		expect(prompt.isOpen.value).toBe(false);
	});

	it('closes when a new reply starts, but not when the stopped reply ends', async () => {
		const { thread, prompt } = setup([makeTask()]);
		thread.isStreaming = true;
		await nextTick();
		prompt.openIfTasksRunning();

		thread.isStreaming = false;
		await nextTick();

		expect(prompt.isOpen.value).toBe(true);

		thread.isStreaming = true;
		await nextTick();

		expect(prompt.isOpen.value).toBe(false);
	});
});
