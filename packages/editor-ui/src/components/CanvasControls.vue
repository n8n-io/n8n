<template>
	<div
		:class="{
			[$style.zoomMenu]: true,
			[$style.regularZoomMenu]: !isDemo,
			[$style.demoZoomMenu]: isDemo,
		}"
	>
		<n8n-icon-button
			@click="zoomToFit"
			type="tertiary"
			size="large"
			:title="$locale.baseText('nodeView.zoomToFit')"
			icon="expand"
			data-test-id="zoom-to-fit"
		/>
		<n8n-icon-button
			@click="zoomIn"
			type="tertiary"
			size="large"
			:title="$locale.baseText('nodeView.zoomIn')"
			icon="search-plus"
		/>
		<n8n-icon-button
			@click="zoomOut"
			type="tertiary"
			size="large"
			:title="$locale.baseText('nodeView.zoomOut')"
			icon="search-minus"
		/>
		<n8n-icon-button
			v-if="nodeViewScale !== 1 && !isDemo"
			@click="resetZoom"
			type="tertiary"
			size="large"
			:title="$locale.baseText('nodeView.resetZoom')"
			icon="undo"
		/>
	</div>
</template>
<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '@/stores/canvas';

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
	bottom: 108px;
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
