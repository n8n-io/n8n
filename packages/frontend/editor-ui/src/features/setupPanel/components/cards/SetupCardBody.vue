<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import { type INodeProperties, NodeHelpers } from 'n8n-workflow';

import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';

import type {
	NodeSetupState,
	CredentialSelectedPayload,
	CredentialDeselectedPayload,
} from '@/features/setupPanel/setupPanel.types';
import type { INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { isHttpRequestNodeType } from '@/features/setupPanel/setupPanel.utils';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

const NESTED_PARAM_TYPES = new Set([
	'collection',
	'fixedCollection',
	'resourceMapper',
	'filter',
	'assignmentCollection',
]);

const props = defineProps<{
	state: NodeSetupState;
	/**
	 * For the panel: parameters that have been shown at least once.
	 * New parameters discovered by this component are emitted via `parametersDiscovered`
	 * so the parent can accumulate them — this avoids mutating the prop directly.
	 */
	stickyParameters?: INodeProperties[];
	/** Whether this is used in the builder wizard (slightly different ParameterInputList binding) */
	isWizard?: boolean;
}>();

const emit = defineEmits<{
	credentialSelected: [payload: CredentialSelectedPayload];
	credentialDeselected: [payload: CredentialDeselectedPayload];
	valueChanged: [parameterData: IUpdateInformation];
	interacted: [];
	/** Emitted when new parameters are discovered that should be persisted in the sticky list */
	parametersDiscovered: [params: INodeProperties[]];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();
const workflowState = injectWorkflowState();
const ndvStore = useNDVStore();

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const isHttpRequestNode = computed(() => isHttpRequestNodeType(props.state.node.type));

const isNestedParam = (p: INodeProperties) =>
	NESTED_PARAM_TYPES.has(p.type) || p.typeOptions?.multipleValues === true;

/**
 * Computes displayable parameters whose names appear in parameterIssues or
 * additionalParameterNames, filtered by displayOptions.
 */
const discoveredParameters = computed<INodeProperties[]>(() => {
	if (!nodeType.value?.properties) return [];

	const issueParamNames = Object.keys(props.state.parameterIssues);
	const additionalParamNames = props.state.additionalParameterNames ?? [];
	const allParamNames = new Set([...issueParamNames, ...additionalParamNames]);

	return nodeType.value.properties.filter(
		(prop) =>
			allParamNames.has(prop.name) &&
			NodeHelpers.displayParameter(
				props.state.node.parameters,
				prop,
				props.state.node,
				nodeType.value,
			),
	);
});

/**
 * Emit newly discovered parameters so the parent can accumulate them
 * in its own sticky array. This keeps the prop read-only.
 */
watch(
	discoveredParameters,
	(params) => {
		if (!props.stickyParameters) return;
		const newParams = params.filter((p) => !props.stickyParameters!.includes(p));
		if (newParams.length > 0) {
			emit('parametersDiscovered', newParams);
		}
	},
	{ immediate: true },
);

/** Parameters to render: sticky list in panel mode, discovered list in wizard mode. */
const allParameters = computed<INodeProperties[]>(
	() => props.stickyParameters ?? discoveredParameters.value,
);

const simpleParameters = computed(() => allParameters.value.filter((p) => !isNestedParam(p)));
const nestedParameterCount = computed(() => allParameters.value.filter(isNestedParam).length);

const nodeNames = computed(() => (props.state.allNodesUsingCredential ?? []).map((n) => n.name));
const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

const openNdv = () => {
	ndvStore.setActiveNodeName(props.state.node.name, 'other');
};

const onCredentialSelected = (updateInfo: INodeUpdatePropertiesInformation) => {
	if (!props.state.credentialType) return;
	emit('interacted');

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
	emit('interacted');

	const paramName = props.isWizard
		? parameterData.name.replace(/^parameters\./, '')
		: parameterData.name;

	workflowState.updateNodeProperties({
		name: props.state.node.name,
		properties: {
			parameters: {
				...props.state.node.parameters,
				[paramName]: parameterData.value,
			},
		},
	});
	nodeHelpers.updateNodesParameterIssues();
};
</script>

<template>
	<div :class="$style.body">
		<div v-if="state.showCredentialPicker" :class="$style.credentialContainer">
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
						<N8nText
							v-if="isWizard"
							data-test-id="builder-setup-card-nodes-hint"
							size="small"
							color="text-light"
						>
							{{
								i18n.baseText('setupPanel.usedInNodes' as BaseTextKey, {
									interpolate: { count: String(nodeNames.length) },
								})
							}}
						</N8nText>
						<span v-else data-test-id="node-setup-card-nodes-hint" :class="$style.nodesHint">
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
			v-if="simpleParameters.length > 0"
			:parameters="simpleParameters"
			:node-values="isWizard ? { parameters: state.node.parameters } : state.node.parameters"
			:remove-first-parameter-margin="true"
			:remove-last-parameter-margin="true"
			:node="state.node"
			:hide-delete="true"
			:path="isWizard ? 'parameters' : undefined"
			:options-overrides="{ hideExpressionSelector: true, hideFocusPanelButton: true }"
			@value-changed="onValueChanged"
		/>

		<N8nLink
			v-if="nestedParameterCount > 0"
			data-test-id="builder-setup-card-configure-link"
			:underline="true"
			theme="text"
			size="medium"
			@click="openNdv"
		>
			{{
				i18n.baseText('aiAssistant.builder.setupWizard.configureParameters' as BaseTextKey, {
					adjustToNumber: nestedParameterCount,
					interpolate: { count: String(nestedParameterCount) },
				})
			}}
		</N8nLink>
	</div>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.credentialContainer {
	display: flex;
	flex-direction: column;

	:global(.node-credentials) {
		margin-top: 0;
	}
}

.nodesHint {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	cursor: default;
}
</style>
