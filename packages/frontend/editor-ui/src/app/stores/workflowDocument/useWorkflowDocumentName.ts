import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type NamePayload = {
	name: string;
};

export type NameChangeEvent = ChangeEvent<NamePayload>;

export function useWorkflowDocumentName() {
	const name = ref<string>('');

	const onNameChange = createEventHook<NameChangeEvent>();

	function applyName(value: string, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		name.value = value;
		void onNameChange.trigger({ action, payload: { name: value } });
	}

	function setName(value: string) {
		applyName(value);
	}

	return {
		name: readonly(name),
		setName,
		onNameChange: onNameChange.on,
	};
}
