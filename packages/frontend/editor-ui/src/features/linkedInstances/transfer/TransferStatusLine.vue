<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { transferStatus, type TransferCheck, type TransferMoveStatus } from './transferDialogState';

/**
 * One short line that tells screen reader users what the move dialog does now. The details stay
 * in the dialog, so a change does not read out the whole summary.
 */
const props = defineProps<{
	check: TransferCheck;
	move: TransferMoveStatus;
	/** The name of the link. */
	place: string;
}>();

const i18n = useI18n();

function readyText(nodeCount: number, needsSetUp: number): string {
	const checked = i18n.baseText('linkedInstances.transfer.status.checked', {
		adjustToNumber: nodeCount,
		interpolate: { count: String(nodeCount), place: props.place },
	});
	if (needsSetUp === 0) return checked;
	const setUp = i18n.baseText('linkedInstances.transfer.status.needsSetUp', {
		adjustToNumber: needsSetUp,
		interpolate: { count: String(needsSetUp) },
	});
	return i18n.baseText('linkedInstances.transfer.status.checkedNeedsSetUp', {
		interpolate: { checked, setUp },
	});
}

const text = computed(() => {
	const status = transferStatus(props.check, props.move);
	const interpolate = { place: props.place };
	switch (status.kind) {
		case 'checking':
			return i18n.baseText('linkedInstances.transfer.checking');
		case 'cannotMove':
			return i18n.baseText('linkedInstances.transfer.status.cannotMove', { interpolate });
		case 'ready':
			return readyText(status.nodeCount, status.needsSetUp);
		case 'moving':
			return i18n.baseText('linkedInstances.transfer.status.moving', { interpolate });
	}
	// 'silent': each error has its own alert, so the line says nothing more.
	return '';
});
</script>

<template>
	<p role="status" :class="$style.status" data-test-id="transfer-status">{{ text }}</p>
</template>

<style lang="scss" module>
@use './visually-hidden' as a11y;

.status {
	@include a11y.visually-hidden;
	margin: 0;
}
</style>
