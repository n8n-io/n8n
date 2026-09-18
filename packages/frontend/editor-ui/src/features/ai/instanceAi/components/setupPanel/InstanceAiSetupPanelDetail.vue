<script lang="ts" setup>
import { computed, onScopeDispose, provide, ref, watch } from 'vue';
import isEqual from 'lodash/isEqual';
import { N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE, type InstanceAiSetupItem } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { findPlaceholderDetails } from '@n8n/utils/placeholder';
import { deepCopy, type INodeParameters, type INodeProperties } from 'n8n-workflow';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { deriveServiceName } from '@/features/credentials/templatedAuth.utils';
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
import { setParameterValue as setParameterValueByPath } from '@/app/utils/parameterUtils';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import type { SetupCredentialItem } from '../../composables/useSetupPanelActions';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';
import {
	applySetupParameterChanges,
	getSetupParameterChanges,
	getSetupParameterValue,
	type SetupParameterChange,
} from '../../setupPanelParameterChanges';

const props = defineProps<{
	item: InstanceAiSetupItem;
	/** The workflow node behind the item — the panel only opens a detail when it resolves. */
	node: INodeUi;
	workflowId?: string;
	projectId?: string;
	isApplying?: boolean;
}>();

const emit = defineEmits<{
	bindCredential: [item: SetupCredentialItem, credentialId: string];
	applyParameters: [nodeName: string, values: INodeParameters, baseline: INodeParameters];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const credentialItem = computed(() => (props.item.kind === 'credential' ? props.item : undefined));
const parametersItem = computed(() => (props.item.kind === 'parameters' ? props.item : undefined));

// --- Credential selection (local until the bind PATCH re-derives the rows) ---

function savedCredentialId(): string | null {
	const item = props.item;
	if (item.kind !== 'credential') return null;
	const assigned = props.node.credentials?.[item.credentialType];
	if (!assigned || typeof assigned === 'string') return null;
	if (assigned.__aiGatewayManaged === true) return AI_GATEWAY_MANAGED_TAG;
	return assigned.id ?? null;
}

const selectedCredentialId = ref<string | null>(savedCredentialId());
watch(savedCredentialId, (id) => {
	selectedCredentialId.value = id;
});

const selectedCredentials = computed<INodeUi['credentials']>(() => {
	const item = credentialItem.value;
	if (!item) return undefined;

	if (selectedCredentialId.value === AI_GATEWAY_MANAGED_TAG) {
		return { [item.credentialType]: { id: null, name: '', __aiGatewayManaged: true } };
	}

	const cred = selectedCredentialId.value
		? credentialsStore.getCredentialById(selectedCredentialId.value)
		: undefined;

	if (cred) return { [item.credentialType]: { id: cred.id, name: cred.name } };
	return selectedCredentialId.value === savedCredentialId() ? props.node.credentials : {};
});

function onCredentialSelected(update: INodeUpdatePropertiesInformation) {
	const item = credentialItem.value;
	if (!item) return;
	const data = update.properties.credentials?.[item.credentialType];
	let credId: string | null = null;
	if (data && typeof data !== 'string') {
		credId = data.__aiGatewayManaged === true ? AI_GATEWAY_MANAGED_TAG : (data.id ?? null);
	}
	selectedCredentialId.value = credId;
	// T8 will persist managed credentials. The tag is not a credential ID.
	if (credId && credId !== AI_GATEWAY_MANAGED_TAG) {
		emit('bindCredential', item, credId);
	}
}

// Templated Custom Auth is one type shared by every service: name the selector
// after the service from the recipe, and never auto-select another service's key.
const isTemplatedType = computed(
	() => credentialItem.value?.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
);
const credentialsFieldLabel = computed(() => {
	if (!isTemplatedType.value) return undefined;
	const name = deriveServiceName(credentialItem.value?.setupHint);
	return name
		? i18n.baseText('instanceAi.credential.fieldLabel', { interpolate: { name } })
		: undefined;
});

const boundNodeNames = computed(() =>
	(credentialItem.value?.nodeBindings ?? []).map((binding) => binding.nodeName),
);
const usedByNodesLabel = computed(() =>
	i18n.baseText('instanceAi.workflowSetup.usedByNodes', {
		adjustToNumber: boundNodeNames.value.length,
		interpolate: { count: boundNodeNames.value.length },
	}),
);

// --- Parameter edits (buffered locally, applied on Confirm) ---

const parameterChanges = ref<SetupParameterChange[]>([]);
const displayParameters = computed(() =>
	applySetupParameterChanges(props.node.parameters, parameterChanges.value),
);
const parameterRoots = computed(
	() =>
		new Set([
			...(parametersItem.value?.parameterNames ?? []).map(
				(name) => name.split(/[.[\]]/)[0] ?? name,
			),
			// A saved value can resolve an issue while a newer edit still needs confirmation.
			...parameterChanges.value.map((change) => change.path[0]),
		]),
);

watch(
	() => props.node.parameters,
	(saved) => {
		parameterChanges.value = parameterChanges.value.filter(
			(change) => !isEqual(getSetupParameterValue(saved, change.path), change.value),
		);
	},
	{ deep: true },
);

function onParameterValueChanged(update: IUpdateInformation) {
	if (!parametersItem.value) return;
	const parameterName = update.name.replace(/^parameters\./, '');
	// Removed controls emit a cleanup event. Keep their saved values.
	if (!parameterRoots.value.has(parameterName.split(/[.[\]]/)[0])) return;
	const next = deepCopy(displayParameters.value);
	setParameterValueByPath(next, parameterName, update.value);
	parameterChanges.value = getSetupParameterChanges(props.node.parameters, next);
}

function onConfirm() {
	const item = parametersItem.value;
	if (!item || !parameterChanges.value.length) return;
	// Pass the baseline so queued writes preserve later edits to sibling fields.
	const values: INodeParameters = {};
	for (const change of parameterChanges.value) {
		const root = change.path[0];
		if (typeof root === 'string') values[root] = displayParameters.value[root];
	}
	emit('applyParameters', item.nodeName, values, props.node.parameters);
}

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);

const parameterDefinitions = computed<INodeProperties[]>(() => {
	const item = parametersItem.value;
	if (!item || !nodeType.value) return [];
	return nodeType.value.properties.filter((property) => parameterRoots.value.has(property.name));
});

const assignmentCollectionEditableValueIndices = computed<Record<string, number[]>>(() => {
	const result: Record<string, number[]> = {};
	// ParameterInputList can retain a control briefly after its definition changes.
	for (const parameter of nodeType.value?.properties ?? []) {
		if (parameter.type !== 'assignmentCollection') continue;
		const indices = new Set<number>();
		for (const detail of findPlaceholderDetails(props.node.parameters[parameter.name])) {
			if (detail.path[0] !== 'assignments' || detail.path[2] !== 'value') continue;
			const match = /^\[(\d+)\]$/.exec(detail.path[1] ?? '');
			if (match?.[1]) indices.add(Number.parseInt(match[1], 10));
		}
		// Keep a newer draft editable when an earlier save resolves its placeholder.
		const value = displayParameters.value[parameter.name];
		if (
			value &&
			typeof value === 'object' &&
			'assignments' in value &&
			Array.isArray(value.assignments)
		) {
			for (const change of parameterChanges.value) {
				if (change.path[0] !== parameter.name || change.path[1] !== 'assignments') continue;
				const target = change.path[2];
				const index =
					typeof target === 'object'
						? value.assignments.findIndex(
								(assignment) =>
									assignment !== null &&
									typeof assignment === 'object' &&
									'id' in assignment &&
									assignment.id === target.id,
							)
						: Number(target);
				if (Number.isInteger(index) && index >= 0) indices.add(index);
			}
		}
		result[parameter.name] = [...indices];
	}
	return result;
});

// --- Per-item document/NDV store scaffolding ---
// NodeCredentials and ParameterInputList descendants materialize an NDV store
// via injectNDVStore(), keyed by the provided document id. Pinia stores are not
// freed on unmount, so dispose the previous id when it changes and the final
// one on scope teardown (same pattern as WorkflowSetupSectionBody).

const displayNode = computed<INodeUi>(() => {
	if (credentialItem.value) {
		return { ...props.node, credentials: selectedCredentials.value };
	}
	return { ...props.node, parameters: displayParameters.value };
});

const documentId = computed(() =>
	createWorkflowDocumentId(props.workflowId ?? 'instance-ai-setup-panel', props.item.id),
);

const workflowDocumentStore = computed(() => useWorkflowDocumentStore(documentId.value));

watch(
	displayNode,
	(node) => {
		workflowDocumentStore.value.setNodes([node]);
	},
	{ immediate: true, deep: true },
);

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
</script>

<template>
	<div :class="$style.body" data-test-id="instance-ai-setup-panel-detail">
		<NodeCredentials
			v-if="credentialItem"
			:node="displayNode"
			:override-cred-type="credentialItem.credentialType"
			:project-id="projectId"
			:workflow-id="workflowId"
			standalone
			hide-issues
			skip-auto-select
			:credential-setup-hint="credentialItem.setupHint"
			:credentials-field-label="credentialsFieldLabel"
			@credential-selected="onCredentialSelected"
		>
			<template v-if="boundNodeNames.length > 1" #label-postfix>
				<N8nTooltip placement="top">
					<template #content>{{ boundNodeNames.join(', ') }}</template>
					<N8nText size="small" color="text-light">{{ usedByNodesLabel }}</N8nText>
				</N8nTooltip>
			</template>
		</NodeCredentials>

		<template v-else-if="parametersItem">
			<ParameterInputList
				:parameters="parameterDefinitions"
				:node-values="{ parameters: displayNode.parameters }"
				:node="displayNode"
				path="parameters"
				:hide-delete="true"
				:remove-first-parameter-margin="true"
				:remove-last-parameter-margin="true"
				:options-overrides="{ hideExpressionSelector: true, hideFocusPanelButton: true }"
				:assignment-collection-editable-value-indices="assignmentCollectionEditableValueIndices"
				@value-changed="onParameterValueChanged"
			/>
			<div :class="$style.footer">
				<N8nButton
					size="small"
					:disabled="parameterChanges.length === 0 || isApplying"
					:loading="isApplying"
					data-test-id="instance-ai-setup-panel-confirm"
					@click="onConfirm"
				>
					{{ i18n.baseText('generic.confirm') }}
				</N8nButton>
			</div>
		</template>
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

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
