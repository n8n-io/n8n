<script setup lang="ts">
import { computed, ref, watch, provide } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import type { INodeProperties } from 'n8n-workflow';

import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCardNodeHighlight } from '@/features/setupPanel/composables/useCardNodeHighlight';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';

const props = defineProps<{
	state: NodeSetupState;
	firstTriggerName?: string | null;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string; nodeName: string }];
	credentialDeselected: [payload: { credentialType: string; nodeName: string }];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const nodeHelpers = useNodeHelpers();
const workflowState = injectWorkflowState();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const node = computed<INodeUi | null>(() => props.state.node);
const expressionResolveCtx = useExpressionResolveCtx(node);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const hasCredential = computed(() => !!props.state.credentialType);

// Only the workflow's first trigger (by execution order) can be executed from setup cards.
const triggerNode = computed(() => {
	if (!props.firstTriggerName || !props.state.isTrigger) return null;
	return props.state.node.name === props.firstTriggerName ? props.state.node : null;
});

const isTestingCredential = computed(() => {
	const id = props.state.selectedCredentialId;
	return !!id && credentialsStore.isCredentialTestPending(id);
});

const showFooter = computed(
	() => !hasCredential.value || triggerNode.value !== null || props.state.isComplete,
);

const hasParameters = computed(() => Object.keys(props.state.parameterIssues).length > 0);

const nodeNames = computed(() => (props.state.allNodesUsingCredential ?? []).map((n) => n.name));

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

const telemetryPayload = computed(() => {
	if (hasCredential.value) {
		return {
			type: 'nodeCredential',
			credential_type: props.state.credentialType,
			node_type: props.state.node.type,
			has_parameters: hasParameters.value,
			missing_parameters_count: Object.keys(props.state.parameterIssues).length,
		};
	}
	return {
		type: 'parameter',
		node_type: props.state.node.type,
		missing_parameters_count: Object.keys(props.state.parameterIssues).length,
	};
});

/**
 * Tracks which parameters have been shown to the user at least once.
 * This ref is used to persist parameters in the UI even after their issues are resolved,
 * preventing them from disappearing when the user fills them in.
 */
const shownParameters = ref<INodeProperties[]>([]);

/**
 * Get parameters that should be displayed in the card.
 * Once a parameter has been shown (due to having issues), it continues to be shown
 * even after the issue is resolved. This prevents the jarring experience of parameters
 * disappearing as the user fills them in.
 *
 * Note: Uses a side effect (modifying shownParameters ref) to achieve persistence.
 * This is intentional - computed properties normally shouldn't have side effects,
 * but this pattern ensures parameters persist across reactivity updates.
 */
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

/**
 * Check if we've ever shown parameters (persistent across parameter fills).
 * Used to keep the parameter description visible even after all issues are resolved.
 */
const hasShownParameters = computed(() => shownParameters.value.length > 0);

const onCredentialSelected = (credentialId: string) => {
	if (!props.state.credentialType) return;
	setupCard.value?.markInteracted();
	emit('credentialSelected', {
		credentialType: props.state.credentialType,
		credentialId,
		nodeName: props.state.node.name,
	});
};

const onCredentialDeselected = () => {
	if (!props.state.credentialType) return;
	setupCard.value?.markInteracted();
	emit('credentialDeselected', {
		credentialType: props.state.credentialType,
		nodeName: props.state.node.name,
	});
};

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

const { onSharedNodesHintEnter, onSharedNodesHintLeave } = useCardNodeHighlight(
	computed(() => props.state.node.id),
	computed(() => (props.state.allNodesUsingCredential ?? []).map((n) => n.id)),
);

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
		:is-complete="state.isComplete && allParametersAddressed"
		:loading="isTestingCredential"
		:title="state.node.name"
		:show-footer="showFooter"
		:trigger-node="triggerNode"
		:is-testing-credential="isTestingCredential"
		:telemetry-payload="telemetryPayload"
		:highlight-node-ids="[state.node.id]"
		card-test-id="node-setup-card"
	>
		<template #icon>
			<NodeIcon :node-type="nodeType" :size="16" />
		</template>

		<template #card-description>
			<N8nText v-if="triggerNode" size="medium" color="text-base" class="pl-xs pr-xs">
				{{ i18n.baseText('setupPanel.trigger.credential.note') }}
			</N8nText>
			<N8nText v-else-if="hasShownParameters" size="medium" color="text-base" class="pl-xs pr-xs">
				{{ i18n.baseText('setupPanel.parameter.description') }}
			</N8nText>
		</template>
		<div :class="$style.content">
			<div v-if="state.showCredentialPicker" :class="$style['credential-container']">
				<div :class="$style['credential-label-row']">
					<label
						data-test-id="node-setup-card-label"
						:for="`credential-picker-${state.credentialType}`"
						:class="$style['credential-label']"
					>
						{{ i18n.baseText('setupPanel.credentialLabel') }}
					</label>
					<N8nTooltip v-if="nodeNames.length > 1" placement="top">
						<template #content>
							{{ nodeNamesTooltip }}
						</template>
						<span
							data-test-id="node-setup-card-nodes-hint"
							:class="$style['nodes-hint']"
							@mouseenter="onSharedNodesHintEnter"
							@mouseleave="onSharedNodesHintLeave"
						>
							{{
								i18n.baseText('setupPanel.usedInNodes', {
									interpolate: { count: String(nodeNames.length) },
								})
							}}
						</span>
					</N8nTooltip>
				</div>
				<CredentialPicker
					create-button-variant="subtle"
					:class="$style['credential-picker']"
					:app-name="state.credentialDisplayName ?? ''"
					:credential-type="state.credentialType ?? ''"
					:selected-credential-id="state.selectedCredentialId ?? null"
					@credential-selected="onCredentialSelected"
					@credential-deselected="onCredentialDeselected"
				/>
			</div>

			<ParameterInputList
				v-if="parameters.length > 0"
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
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--xs);
}

.credential-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.credential-label-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credential-label {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.nodes-hint {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	cursor: default;
	display: none;

	.credential-container:hover & {
		display: flex;
	}
}

.credential-picker {
	flex: 1;
}
</style>
