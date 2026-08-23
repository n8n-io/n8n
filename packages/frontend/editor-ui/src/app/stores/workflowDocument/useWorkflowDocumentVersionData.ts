import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { WorkflowVersionData } from '@n8n/rest-api-client';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type VersionDataPayload = {
	versionId: string;
	versionData: WorkflowVersionData | null;
};

export type VersionDataChangeEvent = ChangeEvent<VersionDataPayload>;

export function useWorkflowDocumentVersionData() {
	const versionId = ref<string>('');
	const versionData = ref<WorkflowVersionData | null>(null);

	const onVersionDataChange = createEventHook<VersionDataChangeEvent>();

	function applyVersionData(
		data: WorkflowVersionData,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		versionId.value = data.versionId;
		versionData.value = { ...data };
		void onVersionDataChange.trigger({
			action,
			payload: { versionId: data.versionId, versionData: { ...data } },
		});
	}

	function setVersionData(data: WorkflowVersionData) {
		applyVersionData(data);
	}

	return {
		versionId: readonly(versionId),
		versionData: readonly(versionData),
		setVersionData,
		onVersionDataChange: onVersionDataChange.on,
	};
}
