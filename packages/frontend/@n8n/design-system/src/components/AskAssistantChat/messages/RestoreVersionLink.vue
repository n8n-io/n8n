<script setup lang="ts">
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { computed, ref, type Ref } from 'vue';

import RestoreVersionConfirm from './RestoreVersionConfirm.vue';
import { useI18n } from '../../../composables/useI18n';
import IconTextButton from '../../IconTextButton';

interface Props {
	revertVersion: { id: string; createdAt: string };
	streaming?: boolean;
	pruneTimeHours?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	restoreConfirm: [versionId: string];
	restoreCancel: [];
	showVersion: [versionId: string];
}>();

const { t } = useI18n();

// Restore version confirm dialog
const showRestoreConfirm = ref(false);
const restoreButtonRef = ref<{ buttonRef: Ref<HTMLButtonElement | null> } | null>(null);
const restoreConfirmRef = ref<HTMLElement | null>(null);

// Close confirm dialog when clicking outside
onClickOutside(restoreConfirmRef, () => {
	if (showRestoreConfirm.value) {
		showRestoreConfirm.value = false;
	}
});

const formattedDate = computed(() => {
	if (!props.revertVersion?.createdAt) return '';
	const date = new Date(props.revertVersion.createdAt);
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
});

// Calculate modal position based on button location
const buttonElement = computed(() => restoreButtonRef.value?.buttonRef ?? null);
const restoreButtonBounding = useElementBounding(buttonElement);

const modalStyle = computed(() => {
	if (!showRestoreConfirm.value) return {};

	// Position modal below the button, aligned to the right
	return {
		position: 'fixed' as const,
		top: `${restoreButtonBounding.bottom.value + 8}px`,
		right: `${window.innerWidth - restoreButtonBounding.right.value - restoreButtonBounding.width.value / 4}px`,
		zIndex: 9999,
	};
});

function handleRestoreClick() {
	showRestoreConfirm.value = true;
}

function handleRestoreConfirm() {
	emit('restoreConfirm', props.revertVersion.id);
	showRestoreConfirm.value = false;
}

function handleRestoreCancel() {
	emit('restoreCancel');
	showRestoreConfirm.value = false;
}

function handleShowVersion(versionId: string) {
	emit('showVersion', versionId);
}
</script>

<template>
	<div :class="$style.restoreWrapper">
		<div :class="$style.restoreContainer">
			<div :class="$style.restoreLine"></div>
			<IconTextButton
				ref="restoreButtonRef"
				icon="undo-2"
				:disabled="streaming"
				:active="showRestoreConfirm"
				@click="handleRestoreClick"
			>
				{{ t('aiAssistant.textMessage.restoreVersion') }} · {{ formattedDate }}
			</IconTextButton>
			<div :class="$style.restoreLine"></div>
		</div>
		<!-- Teleport modal to body to escape the messages container stacking context -->
		<Teleport to="body">
			<div v-if="showRestoreConfirm" ref="restoreConfirmRef" :style="modalStyle">
				<RestoreVersionConfirm
					:version-id="revertVersion.id"
					:prune-time-hours="pruneTimeHours"
					@confirm="handleRestoreConfirm"
					@cancel="handleRestoreCancel"
					@show-version="handleShowVersion"
				/>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.restoreWrapper {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	margin-bottom: var(--spacing--2xs);
}

.restoreContainer {
	display: flex;
	align-items: center;
	width: 100%;
	padding: 0 var(--spacing--md);
}

.restoreLine {
	flex: 1;
	height: 1px;
	background-color: var(--color--text--tint-1);
}
</style>
