<script setup lang="ts">
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { computed, ref } from 'vue';

import RestoreVersionConfirm from './RestoreVersionConfirm.vue';
import { useI18n } from '../../../composables/useI18n';
import N8nIcon from '../../N8nIcon';

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
const restoreButtonRef = ref<HTMLElement | null>(null);
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
const modalStyle = computed(() => {
	// Get restore button bounding rect for positioning the teleported modal
	const restoreButtonBounding = useElementBounding(restoreButtonRef);
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
			<button
				ref="restoreButtonRef"
				:class="[$style.restoreButton, { [$style.disabled]: streaming, [$style.active]: showRestoreConfirm }]"
				type="button"
				:disabled="streaming"
				@click="handleRestoreClick"
			>
				<N8nIcon icon="undo-2" size="medium" />
				{{ t('aiAssistant.textMessage.restoreVersion') }} · {{ formattedDate }}
			</button>
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

.restoreButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	border-radius: var(--radius--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	white-space: nowrap;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;
	font-weight: var(--font-weight--medium);

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}

	&:active,
	&.active {
		background-color: var(--color--foreground);
	}

	&.disabled {
		cursor: not-allowed;

		&:hover,
		&:active {
			background-color: transparent;
		}
	}
}
</style>
