<script setup lang="ts">
import type { INodeUi, IRunDataDisplayMode } from '@/Interface';
import InputPanel from '@/features/ndv/panel/components/InputPanel.vue';
import TriggerPanel from '@/features/ndv/panel/components/TriggerPanel.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import OutputPanel from '@/features/ndv/panel/components/OutputPanel.vue';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { NodePanelTab } from '../experimentalNdv.store';
import { computed } from 'vue';

const props = defineProps<{
	node: INodeUi;
	tab: Exclude<NodePanelTab, 'properties'>;
	inputNodeName?: string;
	isReadOnly?: boolean;
}>();

const emit = defineEmits<{
	execute: [];
	inputNodeChanged: [nodeName: string];
}>();

const ndvStore = injectNDVStore();
const nodeTypesStore = useNodeTypesStore();

// Mirrors the modal: a trigger's "input" is the listen-for-event flow, not upstream data.
const nodeTypeDescription = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);
const showTriggerPanel = computed(() => {
	const override = nodeTypeDescription.value?.triggerPanel;
	if (typeof override === 'boolean') return override;

	const isTrigger = nodeTypeDescription.value?.group.includes('trigger') ?? false;
	const isWebhookBased = !!nodeTypeDescription.value?.webhooks?.length;
	const isPolling = !!nodeTypeDescription.value?.polling;

	return !props.isReadOnly && isTrigger && (isWebhookBased || isPolling || !!override);
});
const workflowExecutionStateStore = injectWorkflowExecutionStateStore();

const workflowRunData = computed(
	() => workflowExecutionStateStore.value.activeExecution?.data?.resultData?.runData ?? null,
);

function latestRunIndex(nodeName?: string) {
	if (!nodeName) return 0;
	const runs = workflowRunData.value?.[nodeName];
	return runs?.length ? runs.length - 1 : 0;
}

const inputRun = computed(() => latestRunIndex(props.inputNodeName));
const outputRun = computed(() => latestRunIndex(props.node.name));

function setDisplayMode(pane: 'input' | 'output', mode: IRunDataDisplayMode) {
	ndvStore.value.setPanelDisplayMode({ pane, mode });
}
</script>

<template>
	<div :class="$style.component">
		<TriggerPanel
			v-if="tab === 'input' && showTriggerPanel"
			:node-name="node.name"
			:push-ref="ndvStore.pushRef"
			@execute="emit('execute')"
		/>
		<InputPanel
			v-else-if="tab === 'input'"
			:run-index="inputRun"
			:active-node-name="node.name"
			:current-node-name="inputNodeName"
			:push-ref="ndvStore.pushRef"
			:read-only="isReadOnly"
			:search-shortcut="'/'"
			:display-mode="ndvStore.inputPanelDisplayMode"
			:is-mapping-onboarded="ndvStore.isMappingOnboarded"
			:focused-mappable-input="ndvStore.focusedMappableInput"
			@change-input-node="emit('inputNodeChanged', $event)"
			@execute="emit('execute')"
			@display-mode-change="setDisplayMode('input', $event)"
		/>
		<OutputPanel
			v-else
			:run-index="outputRun"
			:active-node-name="node.name"
			:push-ref="ndvStore.pushRef"
			:is-read-only="isReadOnly"
			:is-pane-active="true"
			:display-mode="ndvStore.outputPanelDisplayMode"
			@execute="emit('execute')"
			@display-mode-change="setDisplayMode('output', $event)"
		/>
	</div>
</template>

<style lang="scss" module>
.component {
	height: 100%;
	min-height: 0;
	overflow: hidden;
	background: var(--background--surface);
}
</style>
