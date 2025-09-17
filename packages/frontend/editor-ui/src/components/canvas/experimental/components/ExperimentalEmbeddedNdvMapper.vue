<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { onBeforeUnmount, ref, watch } from 'vue';
import type { Workflow } from 'n8n-workflow';
import { computed, useTemplateRef } from 'vue';
import { N8nPopoverReka } from '@n8n/design-system';
import { useStyles } from '@/composables/useStyles';
import { onClickOutside, useElementHover, useEventListener } from '@vueuse/core';

const {
	node,
	inputNodeName,
	reference,
	visibleOnHover = false,
} = defineProps<{
	workflow: Workflow;
	node: INodeUi;
	inputNodeName: string;
	visibleOnHover?: boolean;
	reference: HTMLElement;
}>();

const state = ref<{ isOpen: true; hasInteracted: boolean } | { isOpen: false }>({ isOpen: false });
const contentRef = useTemplateRef('content');
const ndvStore = useNDVStore();
const canvasStore = useCanvasStore();
const contentElRef = computed(() => contentRef.value?.$el ?? null);
const { APP_Z_INDEXES } = useStyles();
const isReferenceHovered = useElementHover(visibleOnHover ? reference : null, { delayLeave: 200 });
const isMapperHovered = useElementHover(visibleOnHover ? contentElRef : null, { delayLeave: 200 });
const isHovered = computed(() => isReferenceHovered.value || isMapperHovered.value);

function handleFocusIn() {
	state.value = { isOpen: true, hasInteracted: true };
}

function handleReferenceFocusOut(event: FocusEvent | MouseEvent) {
	if (
		!(event.target instanceof Node && reference?.contains(event.target)) &&
		!(event.target instanceof Node && contentElRef.value?.contains(event.target)) &&
		!(event.relatedTarget instanceof Node && contentElRef.value?.$el.contains(event.relatedTarget))
	) {
		state.value = { isOpen: false };
	}
}

watch(isHovered, (hovered) => {
	if (!visibleOnHover || (state.value.isOpen && state.value.hasInteracted)) {
		return;
	}

	state.value = hovered ? { isOpen: true, hasInteracted: false } : { isOpen: false };
});

watch(
	state,
	(value) => {
		canvasStore.setSuppressInteraction(value.isOpen);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	canvasStore.setSuppressInteraction(false);
});

useEventListener(reference, 'focusin', handleFocusIn);
useEventListener(reference, 'focusout', handleReferenceFocusOut);
useEventListener(contentElRef, 'focusin', handleFocusIn);

onClickOutside(contentElRef, handleReferenceFocusOut);
</script>

<template>
	<N8nPopoverReka
		:open="state.isOpen"
		side="left"
		:side-flip="false"
		align="start"
		width="360px"
		:max-height="`calc(100vh - var(--spacing-s) * 2)`"
		:reference="reference"
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
