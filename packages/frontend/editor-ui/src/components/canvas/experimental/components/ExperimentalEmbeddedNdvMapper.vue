<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import { CanvasKey } from '@/constants';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { onBeforeUnmount, watch } from 'vue';
import type { Workflow } from 'n8n-workflow';
import { computed, inject, useTemplateRef } from 'vue';
import { N8nPopoverReka } from '@n8n/design-system';
import { useStyles } from '@/composables/useStyles';

const { node, inputNodeName, visible, virtualRef } = defineProps<{
	workflow: Workflow;
	node: INodeUi;
	inputNodeName: string;
	visible: boolean;
	virtualRef: HTMLElement | undefined;
}>();

const contentRef = useTemplateRef('content');
const ndvStore = useNDVStore();
const canvas = inject(CanvasKey, undefined);
const isVisible = computed(() => visible && !canvas?.isPaneMoving.value);
const canvasStore = useCanvasStore();
const contentElRef = computed(() => contentRef.value?.$el ?? null);
const { APP_Z_INDEXES } = useStyles();

watch(
	isVisible,
	(value) => {
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
	<N8nPopoverReka
		:open="isVisible"
		side="left"
		:side-flip="false"
		align="start"
		width="360px"
		:max-height="`calc(100vh - var(--spacing-s) * 2)`"
		:reference="virtualRef"
		:suppress-auto-focus="true"
		:z-index="APP_Z_INDEXES.NDV + 1"
	>
		<template #content>
			<InputPanel
				ref="content"
				:tabindex="-1"
				:class="[$style.inputPanel, 'ignore-key-press-canvas']"
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
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.inputPanel {
	background-color: transparent;
	padding: var(--spacing-2xs);
	height: 100%;
	overflow: auto;
}

.inputPanelTitle {
	text-transform: uppercase;
	letter-spacing: 3px;
}
</style>
