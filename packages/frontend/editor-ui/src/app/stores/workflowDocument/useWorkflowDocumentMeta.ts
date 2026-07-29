import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { WorkflowMetadata } from '@n8n/rest-api-client';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type MetaPayload = {
	meta: WorkflowMetadata | undefined;
};

export type MetaChangeEvent = ChangeEvent<MetaPayload>;

export function useWorkflowDocumentMeta() {
	const meta = ref<WorkflowMetadata | undefined>();

	const onMetaChange = createEventHook<MetaChangeEvent>();

	function applyMeta(
		newMeta: WorkflowMetadata | undefined,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		meta.value = newMeta;
		void onMetaChange.trigger({ action, payload: { meta: newMeta } });
	}

	function setMeta(newMeta: WorkflowMetadata | undefined) {
		applyMeta(newMeta);
	}

	function addToMeta(data: Partial<WorkflowMetadata>) {
		applyMeta({ ...meta.value, ...data });
	}

	return {
		meta: readonly(meta),
		setMeta,
		addToMeta,
		onMetaChange: onMetaChange.on,
	};
}
