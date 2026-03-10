<script setup lang="ts">
import { computed, ref, watch, provide } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { MANUAL_TRIGGER_NODE_TYPE, type INodeProperties } from 'n8n-workflow';

import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { isHttpRequestNodeType } from '@/features/setupPanel/setupPanel.utils';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

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
const setupPanelStore = useSetupPanelStore();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const nodeHelpers = useNodeHelpers();
const workflowState = injectWorkflowState();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const node = computed<INodeUi | null>(() => props.state.node);
const expressionResolveCtx = useExpressionResolveCtx(node);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const isHttpRequestNode = computed(() => isHttpRequestNodeType(props.state.node.type));

const hasCredential = computed(() => !!props.state.credentialType);

// Determines which node can be executed from this setup card.
// - Triggers: only the workflow's first trigger (by execution order) can be executed.
// - Non-triggers: only nodes with main or aiTool inputs (not AI sub-nodes like memory, model, etc.).
const executableNode = computed(() => {
	if (props.state.isTrigger) {
		if (!props.firstTriggerName || props.state.node.type === MANUAL_TRIGGER_NODE_TYPE) return null;
		return props.state.node.name === props.firstTriggerName ? props.state.node : null;
	}
	if (!nodeHelpers.isNodeExecutable(props.state.node, true, [])) return null;
	return props.state.node;
});

const isTestingCredential = computed(() => {
	const id = props.state.selectedCredentialId;
	return !!id && credentialsStore.isCredentialTestPending(id);
});

const showFooter = computed(
	() => !hasCredential.value || executableNode.value !== null || props.state.isComplete,
);

const hasParameters = computed(() => Object.keys(props.state.parameterIssues).length > 0);

/**
 * Tracks which parameters have been shown to the user at least once.
 * This ref is used to persist parameters in the UI even after their issues are resolved,
 * preventing them from disappearing when the user fills them in.
 */
const shownParameters = ref<INodeProperties[]>([]);

/**
 * Get parameters that should be displayed in the card.
 * Parameters are accumulated: once shown they persist (no disappearing on fill),
 * and new issues that appear dynamically (e.g. via displayOptions changes when
 * a resource locator is filled) are picked up on subsequent evaluations.
 *
 * Note: Uses a side effect (modifying shownParameters ref) to achieve persistence.
 * This is intentional - computed properties normally shouldn't have side effects,
 * but this pattern ensures parameters persist across reactivity updates.
 */
const parameters = computed<INodeProperties[]>(() => {
	if (!nodeType.value?.properties) return [];

	const issueParamNames = Object.keys(props.state.parameterIssues);
	const templateParamNames = props.state.templateParameterNames ?? [];
	const allParamNames = new Set([...issueParamNames, ...templateParamNames]);

	for (const prop of nodeType.value.properties) {
		if (allParamNames.has(prop.name) && !shownParameters.value.includes(prop)) {
			shownParameters.value.push(prop);
		}
	}
	return shownParameters.value;
});

/**
 * Check if we've ever shown parameters (persistent across parameter fills).
 * Used to keep the parameter description visible even after all issues are resolved.
 */
const hasShownParameters = computed(() => shownParameters.value.length > 0);

/** Trigger-only: no credentials, no parameters — standalone trigger card */
const isTriggerOnly = computed(
	() => props.state.isTrigger && !hasCredential.value && !hasShownParameters.value,
);

/** Credential-only: has credential but no parameters shown — use credential icon */
const useCredentialIcon = computed(
	() => hasCredential.value && !hasShownParameters.value && !isTriggerOnly.value,
);

const nodeNames = computed(() => (props.state.allNodesUsingCredential ?? []).map((n) => n.name));

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

const telemetryPayload = computed(() => {
	const types: string[] = [];
	if (isTriggerOnly.value) types.push('trigger');
	if (hasCredential.value) types.push('credential');
	if (hasParameters.value) types.push('param');

	return {
		type: types,
		template_id: workflowDocumentStore?.value?.meta?.templateId,
		workflow_id: workflowsStore.workflow.id,
		node_types: (props.state.allNodesUsingCredential ?? [props.state.node]).map((n) => n.type),
		credential_type: props.state.credentialType,
		has_parameters: hasParameters.value,
		missing_parameters_count: Object.keys(props.state.parameterIssues).length,
	};
});

const onCredentialSelected = (updateInfo: INodeUpdatePropertiesInformation) => {
	if (!props.state.credentialType) throw new Error('Unexpected credential selection');
	setupCard.value?.markInteracted();

	const credentialData = updateInfo.properties.credentials?.[props.state.credentialType];
	const credentialId = typeof credentialData === 'string' ? undefined : credentialData?.id;

	if (credentialId) {
		emit('credentialSelected', {
			credentialType: props.state.credentialType,
			credentialId,
			nodeName: props.state.node.name,
		});
	} else {
		emit('credentialDeselected', {
			credentialType: props.state.credentialType,
			nodeName: props.state.node.name,
		});
	}
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

const onSharedNodesHintEnter = () => {
	setupPanelStore.setHighlightedNodes((props.state.allNodesUsingCredential ?? []).map((n) => n.id));
};

const onSharedNodesHintLeave = () => {
	setupPanelStore.setHighlightedNodes([props.state.node.id]);
};

const allNodeIssuesResolved = ref(Object.keys(props.state.parameterIssues).length === 0);
const allParametersAddressed = computed(
	() =>
		allNodeIssuesResolved.value ||
		// When template parameters exist but there are no current issues,
		// the user already configured them in a previous session
		((props.state.templateParameterNames?.length ?? 0) > 0 &&
			Object.keys(props.state.parameterIssues).length === 0),
);

/** Auto-applied credential cards require manual collapse (or execution) to be marked complete */
const autoAppliedAcknowledged = ref(!props.state.isAutoApplied);

// When the user manually selects a different credential, auto-applied status clears
watch(
	() => props.state.isAutoApplied ?? false,
	(isAutoApplied) => {
		if (!isAutoApplied) {
			autoAppliedAcknowledged.value = true;
		}
	},
);

// Only mark as complete if explicitly closed
watch(expanded, (value, oldValue) => {
	if (oldValue && !value) {
		if (Object.keys(props.state.parameterIssues).length === 0) {
			allNodeIssuesResolved.value = true;
		}
		if (props.state.isAutoApplied) {
			autoAppliedAcknowledged.value = true;
		}
	}
});

/**
 * Card completion logic:
 * - Trigger-only / credential-only cards: pass through state.isComplete directly
 * - Cards with parameters: also require user to have collapsed the card after resolving all issues
 * - Auto-applied credential cards: also require manual collapse or execution to acknowledge
 */
const cardComplete = computed(() => {
	if (hasShownParameters.value) {
		return props.state.isComplete && allParametersAddressed.value && autoAppliedAcknowledged.value;
	}
	return props.state.isComplete && autoAppliedAcknowledged.value;
});

const highlightNodeIds = computed(() => {
	return (props.state.allNodesUsingCredential ?? [props.state.node]).map(({ id }) => id);
});
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="cardComplete"
		:loading="isTestingCredential"
		:title="state.node.name"
		:show-footer="showFooter"
		:executable-node="executableNode"
		:is-trigger="state.isTrigger"
		:is-testing-credential="isTestingCredential"
		:telemetry-payload="telemetryPayload"
		:highlight-node-ids="highlightNodeIds"
		card-test-id="node-setup-card"
	>
		<template #icon>
			<CredentialIcon
				v-if="useCredentialIcon"
				:credential-type-name="state.credentialType!"
				:size="16"
			/>
			<NodeIcon v-else :node-type="nodeType" :size="16" />
		</template>

		<template v-if="isTriggerOnly" #header-extra>
			<N8nTooltip>
				<template #content>
					{{ i18n.baseText('nodeCreator.nodeItem.triggerIconTitle') }}
				</template>
				<N8nIcon icon="zap" size="small" color="text-light" />
			</N8nTooltip>
		</template>

		<template #card-description>
			<N8nText
				v-if="state.isTrigger && hasCredential && !state.selectedCredentialId"
				size="medium"
				color="text-base"
				class="pl-xs pr-xs"
			>
				{{ i18n.baseText('setupPanel.trigger.credential.note') }}
			</N8nText>
			<N8nText v-else-if="hasShownParameters" size="medium" color="text-base" class="pl-xs pr-xs">
				{{ i18n.baseText('setupPanel.parameter.description') }}
			</N8nText>
		</template>
		<div v-if="!isTriggerOnly" :class="$style.content">
			<div v-if="state.showCredentialPicker" :class="$style['credential-container']">
				<NodeCredentials
					:node="state.node"
					:override-cred-type="state.credentialType ?? ''"
					:skip-auto-select="isHttpRequestNode"
					hide-issues
					@credential-selected="onCredentialSelected"
				>
					<template v-if="nodeNames.length > 1" #label-postfix>
						<N8nTooltip placement="top">
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
					</template>
				</NodeCredentials>
			</div>

			<ParameterInputList
				v-if="parameters.length > 0"
				:parameters="parameters"
				:node-values="state.node.parameters"
				:remove-first-parameter-margin="true"
				:node="state.node"
				:hide-delete="true"
				:options-overrides="{ hideExpressionSelector: true, hideFocusPanelButton: true }"
				@value-changed="onValueChanged"
			/>
		</div>
	</SetupCard>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--xs);
}

.credential-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.nodes-hint {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	cursor: default;
}
</style>
