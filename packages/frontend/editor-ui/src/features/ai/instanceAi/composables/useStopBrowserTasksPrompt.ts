import { computed, inject, ref, watch } from 'vue';

import type { ThreadRuntime } from '../instanceAi.store';
import { CloudBrowserTasksKey } from './useCloudBrowserTasks';

/**
 * Stopping a reply leaves its browser tasks running. After a stop, this asks the user whether to
 * stop those tasks too.
 */
export function useStopBrowserTasksPrompt(
	thread: Pick<ThreadRuntime, 'id' | 'isStreaming' | 'cancelBackgroundTask'>,
) {
	// Only the thread view provides the tasks. Without them there is nothing to ask about.
	const cloudBrowserTasks = inject(CloudBrowserTasksKey, undefined);
	const runningTaskIds = computed(
		() =>
			cloudBrowserTasks?.value
				.filter((task) => task.state === 'running')
				.map((task) => task.taskId) ?? [],
	);
	const runningCount = computed(() => runningTaskIds.value.length);
	const isOpen = ref(false);

	function close() {
		isOpen.value = false;
	}

	/** Call after the reply was stopped. Opens the prompt only when a browser task still runs. */
	function openIfTasksRunning() {
		if (runningCount.value > 0) isOpen.value = true;
	}

	/** Stops the tasks that run at the time of the click. */
	function stopTasks() {
		for (const taskId of runningTaskIds.value) void thread.cancelBackgroundTask(taskId);
		close();
	}

	watch(
		() => runningCount.value === 0,
		(noneRunning) => {
			if (noneRunning) close();
		},
	);
	watch(() => thread.id, close);
	// A new reply has its own stop button, so the question about the old one no longer applies.
	watch(
		() => thread.isStreaming,
		(isStreaming, wasStreaming) => {
			if (isStreaming && !wasStreaming) close();
		},
	);

	return { isOpen, runningCount, openIfTasksRunning, stopTasks, close };
}
