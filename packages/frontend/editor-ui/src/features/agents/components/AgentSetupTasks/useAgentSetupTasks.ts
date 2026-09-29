import { computed, type ComputedRef } from 'vue';

import {
	setupTaskDefinitions,
	setupTaskOrder,
	type SetupContext,
	type SetupTask,
	type SetupTaskDefinition,
	type SetupTaskId,
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

	return { tasks };
}
