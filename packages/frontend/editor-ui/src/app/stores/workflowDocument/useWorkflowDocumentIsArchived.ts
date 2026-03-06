import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type IsArchivedPayload = {
	isArchived: boolean;
};

export type IsArchivedChangeEvent = ChangeEvent<IsArchivedPayload>;

export function useWorkflowDocumentIsArchived() {
	const isArchived = ref<boolean>(false);

	const onIsArchivedChange = createEventHook<IsArchivedChangeEvent>();

	function applyIsArchived(value: boolean, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		isArchived.value = value;
		void onIsArchivedChange.trigger({ action, payload: { isArchived: value } });
	}

	function setIsArchived(value: boolean) {
		applyIsArchived(value);
	}

	return {
		isArchived: readonly(isArchived),
		setIsArchived,
		onIsArchivedChange: onIsArchivedChange.on,
	};
}
