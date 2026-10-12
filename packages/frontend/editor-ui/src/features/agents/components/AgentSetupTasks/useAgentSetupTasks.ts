import { computed, ref, watch, type ComputedRef } from 'vue';

import { TIME } from '@/app/constants/durations';

import {
	setupTaskDefinitions,
	setupTaskOrder,
	type SetupContext,
	type SetupTask,
	type SetupTaskDefinition,
	type SetupTaskId,
	type SetupTaskState,
} from './agentSetupTasks.registry';

export function useAgentSetupTasks(context: ComputedRef<SetupContext>) {
	const tasks = computed<Array<SetupTask<SetupTaskId>>>(() => {
		return setupTaskOrder.map((id) => {
			const definition: SetupTaskDefinition = setupTaskDefinitions[id];
			const { getState, getVisible, ...task } = definition;

			return {
				...task,
				id,
				visible: getVisible?.(context.value) ?? true,
				state: getState(context.value),
			};
		});
	});

	const isVisible = ref(false);
	const checklistState = computed<SetupTaskState>(() => {
		if (tasks.value.some((task) => task.state === 'unknown')) return 'unknown';

		return tasks.value.some((task) => task.visible && task.state !== 'complete')
			? 'todo'
			: 'complete';
	});

	watch(
		checklistState,
		(state, _, onCleanup) => {
			if (state !== 'complete') {
				isVisible.value = state === 'todo';
				return;
			}

			if (!isVisible.value) return;

			const timeout = setTimeout(() => {
				isVisible.value = false;
			}, 5 * TIME.SECOND);

			onCleanup(() => clearTimeout(timeout));
		},
		{ immediate: true },
	);

	return { tasks, isVisible };
}
