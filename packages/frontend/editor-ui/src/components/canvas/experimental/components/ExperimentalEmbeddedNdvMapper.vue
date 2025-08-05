<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import { CanvasKey } from '@/constants';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { N8nPopover } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { watchOnce } from '@vueuse/core';
import type { Workflow } from 'n8n-workflow';
import { computed, inject, ref, useTemplateRef } from 'vue';

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

watchOnce(isVisible, (value) => {
	isOnceVisible.value = isOnceVisible.value || value;
});

defineExpose({
	contentRef: computed<HTMLElement>(() => contentRef.value?.$el ?? null),
});
</script>

<template>
	<N8nPopover
		:visible="isVisible"
		placement="left"
		:show-arrow="false"
		:popper-class="$style.component"
		:width="360"
		:offset="8"
		append-to="#canvas"
		:popper-options="{
			modifiers: [{ name: 'flip', enabled: false }],
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
	</N8nPopover>
</template>

<style lang="scss" module>
.component {
	background-color: transparent !important;
	padding: var(--spacing-s) 0 !important;
	border: none !important;
	box-shadow: none !important;
	margin-top: -2px;
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
