<script lang="ts" setup>
import { computed, provide, ref, watch } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { Workflow, type IConnections, type INodeProperties } from 'n8n-workflow';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const props = defineProps<{
	section: WorkflowSetupSection;
}>();

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const environmentsStore = useEnvironmentsStore();

const credentialType = computed(() => props.section.credentialType);

const selectedCredentialId = computed(() =>
	credentialType.value
		? (ctx.credentialSelections.value[props.section.targetNodeName]?.[credentialType.value] ?? null)
		: null,
);

const targetNodeNames = computed(() =>
	props.section.credentialTargetNodes.map((node) => node.name),
);
const targetNodeNamesTooltip = computed(() => targetNodeNames.value.join(', '));
const usedByNodesLabel = computed(() =>
	i18n.baseText('instanceAi.workflowSetup.usedByNodes', {
		adjustToNumber: targetNodeNames.value.length,
		interpolate: { count: targetNodeNames.value.length },
	}),
);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.section.node.type, props.section.node.typeVersion),
);

const parameterDefinitions = computed<INodeProperties[]>(() => {
	if (!nodeType.value || props.section.parameterNames.length === 0) return [];
	const names = new Set(props.section.parameterNames);
	return nodeType.value.properties.filter((property) => names.has(property.name));
});

const revealedIssues = ref(new Set<string>());

watch(
	() => props.section.id,
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

const displayNode = computed<INodeUi>(() => {
	const node = ctx.getDisplayNode(props.section);
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
		nodeTypes: nodeTypesStore.getAllNodeTypes(),
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
	ctx.setCredential(props.section, data?.id ?? null);
}

function onParameterValueChanged(update: IUpdateInformation) {
	const parameterName = update.name.replace(/^parameters\./, '');
	ctx.setParameterValue(props.section, parameterName, update.value);
	revealParameterIssues(getRootParameterName(parameterName));
}
</script>

<template>
	<div :class="$style.body">
		<NodeCredentials
			v-if="credentialType"
			:node="displayNode"
			:override-cred-type="credentialType"
			:project-id="ctx.projectId.value"
			standalone
			hide-issues
			hide-ask-assistant
			@credential-selected="onCredentialSelected"
		>
			<template v-if="section.credentialTargetNodes.length > 1" #label-postfix>
				<N8nTooltip placement="top">
					<template #content>{{ targetNodeNamesTooltip }}</template>
					<N8nText
						size="small"
						color="text-light"
						data-test-id="instance-ai-workflow-setup-card-nodes-hint"
					>
						{{ usedByNodesLabel }}
					</N8nText>
				</N8nTooltip>
			</template>
		</NodeCredentials>

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
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	:global(.node-credentials) {
		margin-top: 0;
	}
}

.parameters {
	display: flex;
	flex-direction: column;
}
</style>
