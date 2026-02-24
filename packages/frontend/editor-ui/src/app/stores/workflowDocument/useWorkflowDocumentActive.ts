import { ref, readonly, computed } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { WorkflowHistory } from '@n8n/rest-api-client';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type ActiveStatePayload = {
	activeVersionId: string | null;
	activeVersion: WorkflowHistory | null;
};

export type ActiveChangeEvent = ChangeEvent<ActiveStatePayload>;

export function useWorkflowDocumentActive() {
	const activeVersionId = ref<string | null>(null);
	const activeVersion = ref<WorkflowHistory | null>(null);
	const active = computed(() => activeVersionId.value !== null);

	const onActiveChange = createEventHook<ActiveChangeEvent>();

	function applyActiveState(
		state: ActiveStatePayload,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		activeVersionId.value = state.activeVersionId;
		activeVersion.value = state.activeVersion;
		void onActiveChange.trigger({ action, payload: state });
	}

	function setActiveState(state: ActiveStatePayload) {
		applyActiveState(state);
	}

	return {
		active,
		activeVersionId: readonly(activeVersionId),
		activeVersion: readonly(activeVersion),
		setActiveState,
		onActiveChange: onActiveChange.on,
	};
}
