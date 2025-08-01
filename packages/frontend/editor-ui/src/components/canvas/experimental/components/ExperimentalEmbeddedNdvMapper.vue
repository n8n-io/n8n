<script setup lang="ts">
import InputPanel from '@/components/InputPanel.vue';
import { CanvasKey } from '@/constants';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useVueFlow } from '@vue-flow/core';
import { useActiveElement } from '@vueuse/core';
import { ElPopover } from 'element-plus';
import type { Workflow } from 'n8n-workflow';
import { inject, ref, useTemplateRef, watch } from 'vue';
import { I18nT } from 'vue-i18n';

const { node, container, inputNodeName } = defineProps<{
	workflow?: Workflow;
	node?: INodeUi;
	container: HTMLDivElement | null;
	inputNodeName?: string;
}>();

const emit = defineEmits<{
	captureWheelDataContainer: [WheelEvent];
}>();

const ndvStore = useNDVStore();
const vf = useVueFlow();
const canvas = inject(CanvasKey, undefined);
const i18n = useI18n();
const activeElement = useActiveElement();

const inputPanelRef = useTemplateRef('inputPanel');
const shouldShowInputPanel = ref(false);

function getShouldShowInputPanel() {
	const active = activeElement.value;

	if (!inputNodeName || !active || !container || !container.contains(active)) {
		return false;
	}

	// TODO: find a way to implement this without depending on test ID
	return (
		!!active.closest('[data-test-id=inline-expression-editor-input]') ||
		((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
			active.value === '') ||
		!!inputPanelRef.value?.$el.contains(active)
	);
}

watch([activeElement, vf.getSelectedNodes], ([active, selected]) => {
	// TODO: pane does not close when field is blurred

	if (active && container?.contains(active)) {
		shouldShowInputPanel.value = getShouldShowInputPanel();
	}

	if (selected.every((sel) => sel.id !== node?.id)) {
		shouldShowInputPanel.value = false;
	}
});

watch(
	() => canvas?.isPaneMoving.value ?? false,
	(moving) => {
		shouldShowInputPanel.value = !moving && getShouldShowInputPanel();
	},
);

watch(
	() => canvas?.viewport.value,
	() => {
		shouldShowInputPanel.value = false;
	},
);
</script>

<template>
	<ElPopover
		:visible="shouldShowInputPanel"
		placement="left"
		:show-arrow="false"
		:popper-class="$style.component"
		:width="360"
		:offset="8"
		:append-to="vf.viewportRef?.value"
		:popper-options="{
			modifiers: [{ name: 'flip', enabled: false }],
		}"
	>
		<template #reference>
			<slot />
		</template>
		<InputPanel
			v-if="workflow && node"
			ref="inputPanel"
			:tabindex="-1"
			:class="$style.inputPanel"
			:style="{
				maxHeight: `calc(${vf.viewportRef.value?.offsetHeight ?? 0}px - var(--spacing-s) * 2)`,
			}"
			:workflow="workflow"
			:run-index="0"
			compact
			push-ref=""
			display-mode="schema"
			disable-display-mode-selection
			:active-node-name="node.name"
			:current-node-name="inputNodeName"
			:is-mapping-onboarded="ndvStore.isMappingOnboarded"
			:focused-mappable-input="ndvStore.focusedMappableInput"
			@capture-wheel-data-container="emit('captureWheelDataContainer', $event)"
		>
			<template v-if="inputNodeName" #node-not-run>
				<N8nText color="text-base" size="small">
					<I18nT scope="global" keypath="ndv.input.noOutputData.embeddedNdv.description">
						<template #link>
							<NodeExecuteButton
								:class="$style.executeButton"
								size="medium"
								:node-name="inputNodeName"
								:label="i18n.baseText('ndv.input.noOutputData.embeddedNdv.link')"
								text
								telemetry-source="inputs"
								hide-icon
							/>
						</template>
					</I18nT>
				</N8nText>
			</template>
		</InputPanel>
	</ElPopover>
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

.executeButton {
	padding: 0;
}
</style>
