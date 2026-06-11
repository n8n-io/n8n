import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type ChecksumPayload = {
	checksum: string;
};

export type ChecksumChangeEvent = ChangeEvent<ChecksumPayload>;

export function useWorkflowDocumentChecksum() {
	const checksum = ref<string>('');

	const onChecksumChange = createEventHook<ChecksumChangeEvent>();

	function applyChecksum(newChecksum: string, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		checksum.value = newChecksum;
		void onChecksumChange.trigger({ action, payload: { checksum: newChecksum } });
	}

	function setChecksum(newChecksum: string) {
		applyChecksum(newChecksum);
	}

	return {
		checksum: readonly(checksum),
		setChecksum,
		onChecksumChange: onChecksumChange.on,
	};
}
