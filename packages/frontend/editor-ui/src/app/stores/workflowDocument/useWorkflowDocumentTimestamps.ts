import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type TimestampValue = number | string;

export type CreatedAtPayload = {
	createdAt: TimestampValue;
};

export type UpdatedAtPayload = {
	updatedAt: TimestampValue;
};

export type CreatedAtChangeEvent = ChangeEvent<CreatedAtPayload>;
export type UpdatedAtChangeEvent = ChangeEvent<UpdatedAtPayload>;

export function useWorkflowDocumentTimestamps() {
	const createdAt = ref<TimestampValue>(-1);
	const updatedAt = ref<TimestampValue>(-1);

	const onCreatedAtChange = createEventHook<CreatedAtChangeEvent>();
	const onUpdatedAtChange = createEventHook<UpdatedAtChangeEvent>();

	function applyCreatedAt(value: TimestampValue, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		createdAt.value = value;
		void onCreatedAtChange.trigger({ action, payload: { createdAt: value } });
	}

	function applyUpdatedAt(value: TimestampValue, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		updatedAt.value = value;
		void onUpdatedAtChange.trigger({ action, payload: { updatedAt: value } });
	}

	function setCreatedAt(value: TimestampValue) {
		applyCreatedAt(value);
	}

	function setUpdatedAt(value: TimestampValue) {
		applyUpdatedAt(value);
	}

	return {
		createdAt: readonly(createdAt),
		updatedAt: readonly(updatedAt),
		setCreatedAt,
		setUpdatedAt,
		onCreatedAtChange: onCreatedAtChange.on,
		onUpdatedAtChange: onUpdatedAtChange.on,
	};
}
