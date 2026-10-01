import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type DescriptionPayload = {
	description: string | undefined | null;
};

export type DescriptionChangeEvent = ChangeEvent<DescriptionPayload>;

export function useWorkflowDocumentDescription() {
	const description = ref<string | undefined | null>();

	const onDescriptionChange = createEventHook<DescriptionChangeEvent>();

	function applyDescription(
		newDescription: string | undefined | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		description.value = newDescription;
		void onDescriptionChange.trigger({ action, payload: { description: newDescription } });
	}

	function setDescription(newDescription: string | undefined | null) {
		applyDescription(newDescription);
	}

	return {
		description: readonly(description),
		setDescription,
		onDescriptionChange: onDescriptionChange.on,
	};
}
