import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';
import { useWorkflowsStore } from '../workflows.store';

export type NamePayload = {
	name: string;
};

export type NameChangeEvent = ChangeEvent<NamePayload>;

export function useWorkflowDocumentName() {
	const name = ref<string>('');
	const workflowsStore = useWorkflowsStore();

	const onNameChange = createEventHook<NameChangeEvent>();

	function applyName(value: string, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		name.value = value;
		void onNameChange.trigger({ action, payload: { name: value } });
	}

	function setName(value: string) {
		applyName(value);
		workflowsStore.workflowObject.name = value; // TODO: delegates to workflows store for now
	}

	return {
		name: readonly(name),
		setName,
		onNameChange: onNameChange.on,
	};
}
