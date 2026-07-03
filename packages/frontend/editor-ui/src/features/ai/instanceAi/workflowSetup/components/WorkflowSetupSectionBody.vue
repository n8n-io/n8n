<script lang="ts" setup>
import { computed, onScopeDispose, provide, ref, watch } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import InstanceAiCredentialForm from '../../components/InstanceAiCredentialForm.vue';
import FreeAiCreditsCallout from '@/app/components/FreeAiCreditsCallout.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useAiGateway } from '@/app/composables/useAiGateway';
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

const props = defineProps<{
	section: WorkflowSetupSection;
}>();

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const aiGateway = useAiGateway();

const credentialType = computed(() => props.section.credentialType);

// The node's target URL (HTTP Request node) — gives "Help me get this" real
// provider context. Undefined when it's an expression or absent.
const providerUrl = computed(() => {
	const url = props.section.node.parameters?.url;
	return typeof url === 'string' ? url : undefined;
});

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

// Gate on the same store source NodeCredentials builds its dropdown from. With no
// usable credential of this type it would render an empty-state "set up" button
// (which opens the modal) — render the inline form instead.
const hasUsableCredentials = computed(() => {
	const type = credentialType.value;
	if (!type) return false;
	return (credentialsStore.getUsableCredentialByType(type)?.length ?? 0) > 0;
});

// The AI-gateway "use n8n managed" option is offered by NodeCredentials even
// with no existing credential — mirror NodeCredentials' showAiGatewaySelector so
// the gate below doesn't hide it.
const supportsAiGatewayManaged = computed(() => {
	const type = credentialType.value;
	if (!type || !aiGateway.isEnabled.value) return false;
	return (
		aiGateway.isNodeTypeVersionSupported(props.section.node.type, props.section.node.typeVersion) &&
		aiGateway.isCredentialTypeSupported(type)
	);
});

// Show the NodeCredentials selector when there's something to select — an
// existing usable credential or the AI-gateway managed option. Otherwise the
// inline form handles creating/connecting a new credential.
const shouldRenderSelector = computed(
	() => hasUsableCredentials.value || supportsAiGatewayManaged.value,
);

const inlineForm = ref<{
	mode: 'new' | 'edit';
	credentialType: string;
	credentialId?: string;
} | null>(null);

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
		inlineForm.value = null;
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

function openInlineCreate(type: string) {
	inlineForm.value = { mode: 'new', credentialType: type };
}

function openInlineEdit(payload: { credentialType: string; credentialId: string }) {
	inlineForm.value = {
		mode: 'edit',
		credentialType: payload.credentialType,
		credentialId: payload.credentialId,
	};
}

function onInlineFormSaved(credentialId: string) {
	ctx.setCredential(props.section, credentialId);
	inlineForm.value = null;
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

		<InstanceAiCredentialForm
			v-if="credentialType && inlineForm"
			:key="`${inlineForm.mode}:${inlineForm.credentialType}:${inlineForm.credentialId ?? ''}`"
			:credential-type="inlineForm.credentialType"
			:mode="inlineForm.mode"
			:credential-id="inlineForm.credentialId"
			:project-id="ctx.projectId.value"
			:provider-url="providerUrl"
			show-back
			@saved="onInlineFormSaved"
			@back="inlineForm = null"
		/>
		<NodeCredentials
			v-else-if="credentialType && shouldRenderSelector"
			:node="displayNode"
			:override-cred-type="credentialType"
			:project-id="ctx.projectId.value"
			standalone
			hide-issues
			hide-ask-assistant
			inline-credential-actions
			@credential-selected="onCredentialSelected"
			@create-requested="openInlineCreate"
			@edit-requested="openInlineEdit"
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
		<InstanceAiCredentialForm
			v-else-if="credentialType"
			:credential-type="credentialType"
			:project-id="ctx.projectId.value"
			:provider-url="providerUrl"
			@saved="onInlineFormSaved"
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
