<script lang="ts" setup>
import { computed, provide, ref, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createFrontendNodeTypes } from '@/app/utils/nodeTypes/createFrontendNodeTypes';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { Workflow, type IConnections, type INodeProperties } from 'n8n-workflow';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const environmentsStore = useEnvironmentsStore();
const frontendNodeTypes = createFrontendNodeTypes(nodeTypesStore);

const card = computed(() => ctx.activeCard.value!);
const credentialType = computed(() => card.value.credentialType);

const selectedCredentialId = computed(() =>
	credentialType.value
		? (ctx.selections.value[card.value.targetNodeName]?.[credentialType.value] ?? null)
		: null,
);

const isComplete = computed(() => ctx.isCardComplete(card.value));
const isSkipped = computed(() => ctx.isCardSkipped(card.value));

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(card.value.node.type, card.value.node.typeVersion),
);

const parameterDefinitions = computed<INodeProperties[]>(() => {
	if (!nodeType.value || card.value.parameterNames.length === 0) return [];
	const names = new Set(card.value.parameterNames);
	return nodeType.value.properties.filter((property) => names.has(property.name));
});

const useCredentialIcon = computed(
	() => !!credentialType.value && parameterDefinitions.value.length === 0,
);

const revealedIssues = ref(new Set<string>());

watch(
	() => card.value.id,
	() => {
		revealedIssues.value = new Set();
	},
);

const hiddenIssuesInputs = computed(() =>
	parameterDefinitions.value
		.filter((param) => !revealedIssues.value.has(param.name))
		.map((param) => param.name),
);

function revealParameterIssues(parameterName: string) {
	revealedIssues.value.add(parameterName);
}

function getRootParameterName(parameterName: string) {
	return parameterName.split(/[.[\]]/)[0] ?? parameterName;
}

const displayName = computed(() => {
	if (!credentialType.value) return card.value.node.name;
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType.value)?.displayName ??
		credentialType.value;
	const appName = getAppNameFromCredType(raw);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name: appName } });
});

const displayNode = computed<INodeUi>(() => {
	const node = ctx.getDisplayNode(card.value);
	if (!credentialType.value) return node;
	const cred = selectedCredentialId.value
		? credentialsStore.getCredentialById(selectedCredentialId.value)
		: undefined;
	return {
		...node,
		credentials: cred ? { [credentialType.value]: { id: cred.id, name: cred.name } } : {},
	} as INodeUi;
});

const expressionContext = computed<ExpressionLocalResolveContext | undefined>(() => {
	const node = displayNode.value;
	const connections: IConnections = {};
	const workflow = new Workflow({
		id: 'instance-ai-workflow-setup',
		name: 'Instance AI workflow setup',
		nodes: [node],
		connections,
		active: false,
		nodeTypes: frontendNodeTypes,
	});

	return {
		localResolve: true,
		envVars: environmentsStore.variablesAsObject,
		workflow,
		execution: null,
		nodeName: node.name,
		additionalKeys: {},
		connections,
	};
});

provide(ExpressionLocalResolveContextSymbol, expressionContext);

function onCredentialSelected(update: INodeUpdatePropertiesInformation) {
	if (!credentialType.value) return;
	const data = update.properties.credentials?.[credentialType.value];
	ctx.setSelection(card.value.targetNodeName, credentialType.value, data?.id ?? null);
}

function onParameterValueChanged(update: IUpdateInformation) {
	const parameterName = update.name.replace(/^parameters\./, '');
	ctx.setParameterValue(card.value, parameterName, update.value);
	revealParameterIssues(getRootParameterName(parameterName));
}
</script>

<template>
	<div :class="$style.card" data-test-id="instance-ai-workflow-setup-card">
		<header :class="$style.header">
			<CredentialIcon
				v-if="useCredentialIcon"
				:credential-type-name="credentialType ?? null"
				:size="16"
			/>
			<NodeIcon v-else :node-type="nodeType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ displayName }}
			</N8nText>
			<N8nText
				v-if="isComplete"
				data-test-id="instance-ai-workflow-setup-card-check"
				:class="$style.completeLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
			<N8nText
				v-else-if="isSkipped"
				data-test-id="instance-ai-workflow-setup-card-skipped"
				:class="$style.skippedLabel"
				size="medium"
				color="text-light"
			>
				<N8nIcon icon="arrow-right" size="large" />
				{{ i18n.baseText('instanceAi.workflowSetup.cardSkipped') }}
			</N8nText>
		</header>

		<div :class="$style.body">
			<NodeCredentials
				v-if="credentialType"
				:node="displayNode"
				:override-cred-type="credentialType"
				:project-id="ctx.projectId.value"
				standalone
				hide-issues
				@credential-selected="onCredentialSelected"
			/>

			<div
				v-if="parameterDefinitions.length > 0"
				:class="$style.parameters"
				data-test-id="instance-ai-workflow-setup-parameters"
			>
				<ParameterInputList
					:parameters="parameterDefinitions"
					:node-values="{ parameters: displayNode.parameters }"
					:node="displayNode"
					path="parameters"
					:hide-delete="true"
					:hidden-issues-inputs="hiddenIssuesInputs"
					:remove-first-parameter-margin="true"
					:remove-last-parameter-margin="true"
					:options-overrides="{ hideExpressionSelector: true, hideFocusPanelButton: true }"
					@value-changed="onParameterValueChanged"
					@parameter-blur="revealParameterIssues"
				/>
			</div>
		</div>

		<slot name="footer" />
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
}

.title {
	flex: 1;
}

.completeLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.skippedLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm);

	:global(.node-credentials) {
		margin-top: 0;
	}
}

.parameters {
	display: flex;
	flex-direction: column;
}
</style>
