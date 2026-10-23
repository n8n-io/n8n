<script lang="ts" setup>
import { computed, onScopeDispose, provide, ref, watch } from 'vue';
import isEqual from 'lodash/isEqual';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import { findPlaceholderDetails } from '@n8n/utils/placeholder';
import { deepCopy, NodeHelpers, type INodeParameters, type INodeProperties } from 'n8n-workflow';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { setParameterValue as setParameterValueByPath } from '@/app/utils/parameterUtils';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { CompactParameterHintsKey } from '@/app/constants/injectionKeys';
import { useSetupPanelDocument } from '../../composables/useSetupPanelDocument';
import type { SetupParameterSubmission } from '../../composables/useSetupPanelActions';
import {
	applySetupParameterChanges,
	getSetupParameterChanges,
	getSetupParameterValue,
	mergeSetupParameterChanges,
	type SetupParameterChange,
} from '../../setupPanelParameterChanges';

const props = defineProps<{
	item: Extract<InstanceAiSetupItem, { kind: 'parameters' }>;
	/** The workflow node that provides these parameters. */
	node: INodeUi;
	workflowId?: string;
	projectId?: string;
	/** Confirmed edits waiting for the workflow write. */
	pendingChanges?: SetupParameterChange[];
}>();

const emit = defineEmits<{
	'update:hasChanges': [value: boolean];
}>();

const nodeTypesStore = useNodeTypesStore();
provide(CompactParameterHintsKey, true);

const parametersItem = computed(() => props.item);

// --- Parameter edits (buffered locally, applied on Confirm) ---

const parameterChanges = ref<SetupParameterChange[]>([...(props.pendingChanges ?? [])]);
const touchedParameters = ref(new Set<string>());
onScopeDispose(() => emit('update:hasChanges', false));
const displayParameters = computed(() =>
	applySetupParameterChanges(
		props.node.parameters,
		mergeSetupParameterChanges(props.pendingChanges ?? [], parameterChanges.value),
	),
);
const hasChanges = computed(
	() =>
		!isEqual(
			applySetupParameterChanges(props.node.parameters, props.pendingChanges ?? []),
			displayParameters.value,
		),
);
// Submitted queue entries are confirmed; only newer edits remain a draft.
watch(hasChanges, (value) => emit('update:hasChanges', value));
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
	parameterChanges.value = mergeSetupParameterChanges(
		parameterChanges.value,
		getSetupParameterChanges(displayParameters.value, next),
	);
}

function getSubmission(): SetupParameterSubmission | undefined {
	for (const parameter of parameterDefinitions.value) touchedParameters.value.add(parameter.name);
	const item = parametersItem.value;
	if (!item || !hasChanges.value) return;
	// Pass the baseline so queued writes preserve later edits to sibling fields.
	const values: INodeParameters = {};
	for (const change of parameterChanges.value) {
		const root = change.path[0];
		if (typeof root === 'string') values[root] = displayParameters.value[root];
	}
	return {
		nodeName: item.nodeName,
		values,
		baseline: applySetupParameterChanges(props.node.parameters, props.pendingChanges ?? []),
	};
}

defineExpose({ getSubmission });

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);

const parameterDefinitions = computed<INodeProperties[]>(() => {
	const item = parametersItem.value;
	if (!item || !nodeType.value) return [];
	return nodeType.value.properties.filter((property) => parameterRoots.value.has(property.name));
});

const hiddenIssuesInputs = computed(() =>
	parameterDefinitions.value
		.filter((parameter) => !touchedParameters.value.has(parameter.name))
		.map((parameter) => parameter.name),
);

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

const displayNode = computed<INodeUi>(() => ({
	...props.node,
	parameters: nodeType.value
		? (NodeHelpers.getNodeParameters(
				nodeType.value.properties,
				displayParameters.value,
				true,
				true,
				props.node,
				nodeType.value,
			) ?? displayParameters.value)
		: displayParameters.value,
}));

useSetupPanelDocument({
	workflowId: () => props.workflowId,
	itemId: () => props.item.id,
	node: displayNode,
});
</script>

<template>
	<div :class="$style.body" data-test-id="instance-ai-setup-panel-detail">
		<template v-if="parametersItem">
			<ParameterInputList
				:parameters="parameterDefinitions"
				:node-values="{ parameters: displayNode.parameters }"
				:node="displayNode"
				path="parameters"
				:hide-delete="true"
				:remove-first-parameter-margin="true"
				:remove-last-parameter-margin="true"
				:options-overrides="{ hideExpressionSelector: true, hideFocusPanelButton: true }"
				:hidden-issues-inputs="hiddenIssuesInputs"
				:assignment-collection-editable-value-indices="assignmentCollectionEditableValueIndices"
				@value-changed="onParameterValueChanged"
				@parameter-blur="touchedParameters.add($event)"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
