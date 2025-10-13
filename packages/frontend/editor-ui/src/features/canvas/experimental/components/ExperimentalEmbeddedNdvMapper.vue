<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import type { Workflow } from 'n8n-workflow';
import { onBeforeUnmount, watch, computed, ref, useTemplateRef } from 'vue';
import { useStyles } from '@/composables/useStyles';
import {
	onClickOutside,
	useElementHover,
	type UseElementHoverOptions,
	useEventListener,
} from '@vueuse/core';
import { useExperimentalNdvStore } from '../experimentalNdv.store';
import { isEventTargetContainedBy } from '@/utils/htmlUtils';

import { N8nPopoverReka } from '@n8n/design-system';
type MapperState = { isOpen: true; closeOnMouseLeave: boolean } | { isOpen: false };

const hoverOptions: UseElementHoverOptions = {
	delayLeave: 200, // should be a positive value, otherwise user cannot click on the mapper
};

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

const state = ref<MapperState>({ isOpen: false });
const contentRef = useTemplateRef('content');
const ndvStore = useNDVStore();
const experimentalNdvStore = useExperimentalNdvStore();
const contentElRef = computed<HTMLElement | null>(() => contentRef.value?.$el ?? null);
const { APP_Z_INDEXES } = useStyles();
const isReferenceHovered = useElementHover(visibleOnHover ? reference : null, hoverOptions);
const isMapperHovered = useElementHover(visibleOnHover ? contentElRef : null, hoverOptions);
const isHovered = computed(() => isReferenceHovered.value || isMapperHovered.value);

function handleFocusIn() {
	if (experimentalNdvStore.isMapperOpen) {
		// Skip if there's already a mapper opened
		return;
	}

	state.value = { isOpen: true, closeOnMouseLeave: false };
}

function handleReferenceFocusOut(event: FocusEvent | MouseEvent) {
	if (
		isEventTargetContainedBy(event.target, reference) ||
		isEventTargetContainedBy(event.target, contentElRef) ||
		isEventTargetContainedBy(event.relatedTarget, contentElRef)
	) {
		// Skip when focus moves between the mapper and its reference element
		return;
	}

	state.value = { isOpen: false };
}

watch(isHovered, (hovered) => {
	if (
		!visibleOnHover ||
		(state.value.isOpen && !state.value.closeOnMouseLeave) ||
		experimentalNdvStore.isMapperOpen
	) {
		return;
	}

	state.value = hovered ? { isOpen: true, closeOnMouseLeave: true } : { isOpen: false };
});

watch(
	state,
	(value) => {
		experimentalNdvStore.setMapperOpen(value.isOpen && !value.closeOnMouseLeave);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	experimentalNdvStore.setMapperOpen(false);
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
		:max-height="`calc(100vh - var(--spacing--sm) * 2)`"
		:reference="reference"
		:suppress-auto-focus="true"
		:z-index="APP_Z_INDEXES.NDV + 1"
		content-class="ignore-key-press-canvas ignore-key-press-node-creator"
	>
		<template #content>
			<InputPanel
				ref="content"
				:tabindex="-1"
				:class="$style.inputPanel"
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
				:truncate-limit="60"
				search-shortcut="ctrl+f"
			/>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.inputPanel {
	background-color: transparent;
	padding: var(--spacing--2xs);
	height: 100%;
	overflow: auto;
}

.inputPanelTitle {
	text-transform: uppercase;
	letter-spacing: 3px;
}
</style>
