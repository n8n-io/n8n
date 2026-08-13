import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ResourceParentFolder } from '@/features/core/folders/folders.types';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type ParentFolderChangeEvent = ChangeEvent<ResourceParentFolder | null>;

export function useWorkflowDocumentParentFolder() {
	const parentFolder = ref<ResourceParentFolder | null>(null);

	const onParentFolderChange = createEventHook<ParentFolderChangeEvent>();

	function applyParentFolder(
		data: ResourceParentFolder | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		parentFolder.value = data;
		void onParentFolderChange.trigger({ action, payload: data });
	}

	function setParentFolder(data: ResourceParentFolder | null) {
		applyParentFolder(data);
	}

	return {
		parentFolder: readonly(parentFolder),
		setParentFolder,
		onParentFolderChange: onParentFolderChange.on,
	};
}
