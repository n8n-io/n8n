<template>
	<div
		:class="{
			[$style.zoomMenu]: true,
			[$style.regularZoomMenu]: !isDemo,
			[$style.demoZoomMenu]: isDemo,
		}"
	>
		<keyboard-shortcut-tooltip
			:label="$locale.baseText('nodeView.zoomToFit')"
			:shortcut="{ keys: ['1'] }"
		>
			<n8n-icon-button
				@click="zoomToFit"
				type="tertiary"
				size="large"
				icon="expand"
				data-test-id="zoom-to-fit"
			/>
		</keyboard-shortcut-tooltip>
		<keyboard-shortcut-tooltip
			:label="$locale.baseText('nodeView.zoomIn')"
			:shortcut="{ keys: ['+'] }"
		>
			<n8n-icon-button
				@click="zoomIn"
				type="tertiary"
				size="large"
				icon="search-plus"
				data-test-id="zoom-in-button"
			/>
		</keyboard-shortcut-tooltip>
		<keyboard-shortcut-tooltip
			:label="$locale.baseText('nodeView.zoomOut')"
			:shortcut="{ keys: ['-'] }"
		>
			<n8n-icon-button
				@click="zoomOut"
				type="tertiary"
				size="large"
				icon="search-minus"
				data-test-id="zoom-out-button"
			/>
		</keyboard-shortcut-tooltip>
		<keyboard-shortcut-tooltip
			:label="$locale.baseText('nodeView.resetZoom')"
			:shortcut="{ keys: ['0'] }"
		>
			<n8n-icon-button
				v-if="nodeViewScale !== 1 && !isDemo"
				@click="resetZoom"
				type="tertiary"
				size="large"
				icon="undo"
				data-test-id="reset-zoom-button"
			/>
		</keyboard-shortcut-tooltip>
	</div>
</template>
<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '@/stores/canvas.store';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';

const canvasStore = useCanvasStore();
const { zoomToFit, zoomIn, zoomOut, resetZoom } = canvasStore;
const { nodeViewScale, isDemo } = storeToRefs(canvasStore);

const keyDown = (e: KeyboardEvent) => {
	const isCtrlKeyPressed = e.metaKey || e.ctrlKey;
	if ((e.key === '=' || e.key === '+') && !isCtrlKeyPressed) {
		zoomIn();
	} else if ((e.key === '_' || e.key === '-') && !isCtrlKeyPressed) {
		zoomOut();
	} else if (e.key === '0' && !isCtrlKeyPressed) {
		resetZoom();
	} else if (e.key === '1' && !isCtrlKeyPressed) {
		zoomToFit();
	}
};

onBeforeMount(() => {
	document.addEventListener('keydown', keyDown);
});

onBeforeUnmount(() => {
	document.removeEventListener('keydown', keyDown);
});
</script>

<style lang="scss" module>
.zoomMenu {
	position: absolute;
	width: 210px;
	bottom: var(--spacing-2xl);
	left: 35px;
	line-height: 25px;
	color: #444;
	padding-right: 5px;

	button {
		border: var(--border-base);
	}

	> * {
		+ * {
			margin-left: var(--spacing-3xs);
		}

		&:hover {
			transform: scale(1.1);
		}
	}
}

.regularZoomMenu {
	@media (max-width: $breakpoint-2xs) {
		bottom: 90px;
	}
}

.demoZoomMenu {
	left: 10px;
	bottom: 10px;
}
</style>
