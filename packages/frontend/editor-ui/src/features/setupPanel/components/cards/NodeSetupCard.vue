<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { MANUAL_TRIGGER_NODE_TYPE, type INodeProperties } from 'n8n-workflow';

import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import SetupCardSection from '@/features/setupPanel/components/cards/SetupCardSection.vue';
import SetupCardBody from '@/features/setupPanel/components/cards/SetupCardBody.vue';
import type {
	NodeSetupState,
	CredentialSelectedPayload,
	CredentialDeselectedPayload,
} from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const props = defineProps<{
	state: NodeSetupState;
	firstTriggerName?: string | null;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: CredentialSelectedPayload];
	credentialDeselected: [payload: CredentialDeselectedPayload];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const nodeHelpers = useNodeHelpers();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

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
 * Passed to SetupCardBody as stickyParameters for persistence.
 */
const shownParameters = ref<INodeProperties[]>([]);

const hasShownParameters = computed(() => shownParameters.value.length > 0);

/** Trigger-only: no credentials, no parameters — standalone trigger card */
const isTriggerOnly = computed(
	() => props.state.isTrigger && !hasCredential.value && !hasShownParameters.value,
);

/** Credential-only: has credential but no parameters shown — use credential icon */
const useCredentialIcon = computed(
	() => hasCredential.value && !hasShownParameters.value && !isTriggerOnly.value,
);

const telemetryPayload = computed(() => {
	const types: string[] = [];
	if (isTriggerOnly.value) types.push('trigger');
	if (hasCredential.value) types.push('credential');
	if (hasParameters.value) types.push('param');

	return {
		type: types,
		template_id: workflowDocumentStore?.value?.meta?.templateId,
		workflow_id: workflowsStore.workflowId,
		node_types: (props.state.allNodesUsingCredential ?? [props.state.node]).map((n) => n.type),
		credential_type: props.state.credentialType,
		has_parameters: hasParameters.value,
		missing_parameters_count: Object.keys(props.state.parameterIssues).length,
	};
});

const onBodyInteracted = () => {
	setupCard.value?.markInteracted();
};

const allNodeIssuesResolved = ref(Object.keys(props.state.parameterIssues).length === 0);
const allParametersAddressed = computed(
	() =>
		allNodeIssuesResolved.value ||
		// When template parameters exist but there are no current issues,
		// the user already configured them in a previous session
		((props.state.additionalParameterNames?.length ?? 0) > 0 &&
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
		<SetupCardSection v-if="!isTriggerOnly" :state="state">
			<div :class="$style.content">
				<SetupCardBody
					:state="state"
					:sticky-parameters="shownParameters"
					@credential-selected="
						(p) => {
							onBodyInteracted();
							emit('credentialSelected', p);
						}
					"
					@credential-deselected="
						(p) => {
							onBodyInteracted();
							emit('credentialDeselected', p);
						}
					"
					@interacted="onBodyInteracted"
					@parameters-discovered="(params) => shownParameters.push(...params)"
				/>
			</div>
		</SetupCardSection>
	</SetupCard>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--xs);
}
</style>
