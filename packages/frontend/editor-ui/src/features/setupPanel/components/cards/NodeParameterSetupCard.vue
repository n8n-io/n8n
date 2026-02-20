<script setup lang="ts">
import { computed, ref, onBeforeUnmount, watch, provide } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import type { INodeProperties } from 'n8n-workflow';

import NodeIcon from '@/app/components/NodeIcon.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';

import type { NodeParameterSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';

const props = defineProps<{
	state: NodeParameterSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const setupPanelStore = useSetupPanelStore();
const nodeHelpers = useNodeHelpers();
const workflowState = injectWorkflowState();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const node = computed<INodeUi | null>(() => props.state.node);
const expressionResolveCtx = useExpressionResolveCtx(node);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const telemetryPayload = computed(() => ({
	type: 'parameter',
	node_type: props.state.node.type,
	missing_parameters_count: Object.keys(props.state.parameterIssues).length,
}));

const shownParameters = ref<INodeProperties[]>([]);

// Get only the parameters that have issues
const parameters = computed<INodeProperties[]>(() => {
	if (!nodeType.value?.properties) return [];

	if (shownParameters.value.length > 0) return shownParameters.value;

	const issueParamNames = Object.keys(props.state.parameterIssues);
	const result = nodeType.value.properties.filter((param) => issueParamNames.includes(param.name));
	for (const x of result) {
		if (!shownParameters.value.includes(x)) shownParameters.value.push(x);
	}
	return shownParameters.value;
});

const onValueChanged = (parameterData: IUpdateInformation) => {
	setupCard.value?.markInteracted();

	workflowState.updateNodeProperties({
		name: props.state.node.name,
		properties: {
			parameters: {
				...props.state.node.parameters,
				[parameterData.name]: parameterData.value,
			},
		},
	});

	// Update node issues after parameter change
	nodeHelpers.updateNodesParameterIssues();
};

const onCardMouseEnter = () => {
	setupPanelStore.setHighlightedNodes([props.state.node.id]);
};

const onCardMouseLeave = () => {
	setupPanelStore.clearHighlightedNodes();
};

onBeforeUnmount(() => {
	setupPanelStore.clearHighlightedNodes();
});

const allParametersAddressed = ref(false);

// Only mark as complete if explicitly closed
watch(expanded, (value, oldValue) => {
	if (oldValue && !value && Object.keys(props.state.parameterIssues).length === 0) {
		allParametersAddressed.value = true;
	}
});
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="allParametersAddressed"
		:title="state.node.name"
		:telemetry-payload="telemetryPayload"
		card-test-id="parameter-setup-card"
		@mouseenter="onCardMouseEnter"
		@mouseleave="onCardMouseLeave"
	>
		<template #icon>
			<NodeIcon :node-type="nodeType" :size="16" />
		</template>
		<template #card-description>
			<N8nText size="medium" color="text-base" class="pl-xs pr-xs">
				{{ i18n.baseText('setupPanel.parameter.description') }}
			</N8nText>
		</template>
		<div :class="$style.content">
			<ParameterInputList
				:parameters="parameters"
				:node-values="state.node.parameters"
				:node="state.node"
				:hide-delete="true"
				@value-changed="onValueChanged"
			/>
		</div>
	</SetupCard>
</template>

<style module lang="scss">
.content {
	padding: 0 var(--spacing--xs);
}
</style>
