<script lang="ts" setup>
import { computed, onScopeDispose, provide, ref, watch } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import FreeAiCreditsCallout from '@/app/components/FreeAiCreditsCallout.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { ExpressionLocalResolveContextSymbol, WorkflowDocumentStoreKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { INodeProperties } from 'n8n-workflow';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';
import { findPlaceholderDetails } from '@n8n/utils/placeholder';

const props = defineProps<{
	section: WorkflowSetupSection;
}>();

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const credentialType = computed(() => props.section.credentialType);

const selectedCredentialId = computed(() =>
	credentialType.value
		? (ctx.credentialSelections.value[props.section.targetNodeName]?.[credentialType.value] ?? null)
		: null,
);

const selectedCredentials = computed<INodeUi['credentials']>(() => {
	const type = credentialType.value;
	if (!type) return undefined;

	if (selectedCredentialId.value === AI_GATEWAY_MANAGED_TAG) {
		return { [type]: { id: null, name: '', __aiGatewayManaged: true } };
	}

	const cred = selectedCredentialId.value
		? credentialsStore.getCredentialById(selectedCredentialId.value)
		: undefined;

	return cred ? { [type]: { id: cred.id, name: cred.name } } : {};
});

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

const assignmentCollectionEditableValueIndices = computed<Record<string, number[]>>(() => {
	const result: Record<string, number[]> = {};
	for (const parameter of parameterDefinitions.value) {
		if (parameter.type !== 'assignmentCollection') continue;

		const indices = new Set<number>();
		const placeholderDetails = findPlaceholderDetails(
			props.section.node.parameters[parameter.name],
		);
		for (const detail of placeholderDetails) {
			if (detail.path[0] !== 'assignments' || detail.path[2] !== 'value') continue;
			const match = /^\[(\d+)\]$/.exec(detail.path[1] ?? '');
			if (match?.[1]) indices.add(Number.parseInt(match[1], 10));
		}
		result[parameter.name] = [...indices];
	}
	return result;
});

// Reveal validation for the setup-flagged parameters up front, so a required
// field the builder left unset (e.g. an empty resource locator) shows why the
// step is blocked instead of only surfacing after the user edits it.
const revealedIssues = ref(new Set<string>(props.section.parameterNames));

watch(
	() => props.section.id,
	() => {
		revealedIssues.value = new Set(props.section.parameterNames);
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
	return {
		...node,
		credentials: selectedCredentials.value,
	} as INodeUi;
});

const documentId = computed(() =>
	createWorkflowDocumentId(ctx.workflowId.value ?? 'instance-ai-workflow-setup', props.section.id),
);

const workflowDocumentStore = computed(() => useWorkflowDocumentStore(documentId.value));

watch(
	displayNode,
	(node) => {
		workflowDocumentStore.value.setNodes([node]);
	},
	{ immediate: true, deep: true },
);

// The provided document store — and the NDV store its descendants
// (NodeCredentials, ParameterInputList) materialize via injectNDVStore() — are
// keyed by a per-section document id. Pinia stores are not freed when this
// component unmounts, so dispose the previous id whenever it changes and the
// final id on scope teardown.
function disposeStores(id: WorkflowDocumentId) {
	disposeNDVStore(useNDVStore(id));
	disposeWorkflowDocumentStore(useWorkflowDocumentStore(id));
}

watch(documentId, (_newId, oldId) => {
	if (oldId) disposeStores(oldId);
});

onScopeDispose(() => {
	disposeStores(documentId.value);
});

const expressionContext = computed<ExpressionLocalResolveContext | undefined>(() => ({
	localResolve: true,
	nodeName: displayNode.value.name,
	additionalKeys: {},
}));

provide(ExpressionLocalResolveContextSymbol, expressionContext);
provide(WorkflowDocumentStoreKey, workflowDocumentStore);

function onCredentialSelected(update: INodeUpdatePropertiesInformation) {
	if (!credentialType.value) return;
	const data = update.properties.credentials?.[credentialType.value];
	let credId: string | null = null;
	if (data && typeof data !== 'string') {
		credId = data.__aiGatewayManaged === true ? AI_GATEWAY_MANAGED_TAG : (data.id ?? null);
	}
	ctx.setCredential(props.section, credId);
}

function onParameterValueChanged(update: IUpdateInformation) {
	const parameterName = update.name.replace(/^parameters\./, '');
	ctx.setParameterValue(props.section, parameterName, update.value);
	revealParameterIssues(getRootParameterName(parameterName));
}
</script>

<template>
	<div :class="$style.body">
		<FreeAiCreditsCallout
			v-if="credentialType"
			:credential-type-name="credentialType"
			telemetry-source="instanceAiWorkflowSetup"
		/>

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
				:assignment-collection-editable-value-indices="assignmentCollectionEditableValueIndices"
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
