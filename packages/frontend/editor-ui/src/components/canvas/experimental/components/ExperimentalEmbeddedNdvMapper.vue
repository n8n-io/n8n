<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import { CanvasKey } from '@/constants';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { ElPopover } from 'element-plus';
import { useVueFlow } from '@vue-flow/core';
import { useCanvasStore } from '@/stores/canvas.store';
import { onBeforeUnmount, watch } from 'vue';
import type { Workflow } from 'n8n-workflow';
import { computed, inject, ref, useTemplateRef } from 'vue';
import { useElementBounding, useElementSize } from '@vueuse/core';

const { node, inputNodeName, visible, virtualRef } = defineProps<{
	workflow: Workflow;
	node: INodeUi;
	inputNodeName: string;
	visible: boolean;
	virtualRef: HTMLElement | undefined;
}>();

const contentRef = useTemplateRef('content');
const ndvStore = useNDVStore();
const vf = useVueFlow();
const canvas = inject(CanvasKey, undefined);
const isVisible = computed(() => visible && !canvas?.isPaneMoving.value);
const isOnceVisible = ref(isVisible.value);
const canvasStore = useCanvasStore();
const contentElRef = computed(() => contentRef.value?.$el ?? null);
const contentSize = useElementSize(contentElRef);
const refBounding = useElementBounding(virtualRef);

watch(
	isVisible,
	(value) => {
		isOnceVisible.value = isOnceVisible.value || value;
		canvasStore.setSuppressInteraction(value);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	canvasStore.setSuppressInteraction(false);
});

defineExpose({
	contentRef: contentElRef,
});
</script>

<template>
	<ElPopover
		:visible="isVisible"
		placement="left-start"
		:show-arrow="false"
		:popper-class="`${$style.component} ignore-key-press-canvas`"
		:width="360"
		:offset="8"
		append-to="body"
		:popper-options="{
			modifiers: [
				{ name: 'flip', enabled: false },
				{
					// Ensures that the popover is re-positioned when the reference element is resized
					name: 'custom modifier',
					options: {
						refX: refBounding.x.value,
						refY: refBounding.y.value,
						width: contentSize.width.value,
						height: contentSize?.height.value,
					},
				},
			],
		}"
		:persistent="isOnceVisible /* works like lazy initialization */"
		virtual-triggering
		:virtual-ref="virtualRef"
	>
		<InputPanel
			ref="content"
			:tabindex="-1"
			:class="$style.inputPanel"
			:style="{
				maxHeight: `calc(${vf.viewportRef.value?.offsetHeight ?? 0}px - var(--spacing-s) * 2)`,
			}"
			:workflow-object="workflow"
			:run-index="0"
			compact
			push-ref=""
			display-mode="schema"
			disable-display-mode-selection
			:active-node-name="node.name"
			:current-node-name="inputNodeName"
			:is-mapping-onboarded="ndvStore.isMappingOnboarded"
			:focused-mappable-input="ndvStore.focusedMappableInput"
			node-not-run-message-variant="simple"
		/>
	</ElPopover>
</template>

<style lang="scss" module>
.component {
	background-color: transparent !important;
	padding: 0 !important;
	border: none !important;
	box-shadow: none !important;
	margin-top: -2px;

	/* Override styles set for el-popper */
	word-break: normal;
	text-align: unset;
}

.inputPanel {
	border: var(--border-base);
	border-width: 1px;
	background-color: var(--color-background-light);
	border-radius: var(--border-radius-large);
	box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05);
	padding: var(--spacing-2xs);
	height: 100%;
	overflow: auto;
}

.inputPanelTitle {
	text-transform: uppercase;
	letter-spacing: 3px;
}
</style>
