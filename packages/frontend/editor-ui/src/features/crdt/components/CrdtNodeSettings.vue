<script setup lang="ts">
/**
 * CrdtNodeSettings - CRDT-compatible version of NodeSettings
 *
 * Key differences from the original:
 * - activeNode is a required prop (not optional, not from ndvStore)
 * - Uses injected workflowState for mutations (CRDT-backed)
 * - No history store (CRDT has its own undo/redo)
 * - No execute button (no execution in CRDT view)
 * - No sub-connections panel (simplified for now)
 */
import type { INodeUi, IUpdateInformation } from '@/Interface';
import type { INodeParameters } from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import NodeSettingsTabs from '@/features/ndv/settings/components/NodeSettingsTabs.vue';
import get from 'lodash/get';
import set from 'lodash/set';

import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import NodeTitle from '@/app/components/NodeTitle.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { NodeSettingsTab } from '@/app/types/nodeSettings';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import {
	collectParametersByTab,
	collectSettings,
	createCommonNodeSettings,
	nameIsParameter,
} from '@/features/ndv/shared/ndv.utils';
import { useI18n } from '@n8n/i18n';

import { N8nBlockUi, N8nText } from '@n8n/design-system';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';

const props = withDefaults(
	defineProps<{
		activeNode: INodeUi;
		dragging: boolean;
		pushRef: string;
		readOnly: boolean;
		foreignCredentials: string[];
		blockUI: boolean;
		executable: boolean;
	}>(),
	{
		dragging: false,
		readOnly: false,
		blockUI: false,
		executable: false,
	},
);

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
	close: [];
}>();

const nodeTypesStore = useNodeTypesStore();
const workflowState = injectWorkflowState();
const i18n = useI18n();

const openPanel = ref<NodeSettingsTab>('params');
const hiddenIssuesInputs = ref<string[]>([]);

// Use prop directly - no fallback to ndvStore
const node = computed(() => props.activeNode);

const nodeType = computed(() =>
	node.value ? nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion) : null,
);

// Node is valid if its type is known
const nodeValid = computed(() => nodeType.value !== null);

const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const nodeTypeVersions = computed(() => {
	if (!node.value) return [];
	return nodeTypesStore.getNodeVersions(node.value.type);
});

const latestVersion = computed(() => Math.max(...nodeTypeVersions.value));

const parameters = computed(() => {
	if (nodeType.value === null) {
		return [];
	}
	return nodeType.value?.properties ?? [];
});

const parametersByTab = computed(() => collectParametersByTab(parameters.value, false));

const showNoParametersNotice = computed(
	() => (parametersByTab.value.params ?? []).filter((item) => item.type !== 'notice').length === 0,
);

const valueChanged = (parameterData: IUpdateInformation) => {
	const _node = node.value;
	if (!_node) return;

	// Verify we're updating the correct node
	const targetNodeName = parameterData.node || _node.name;
	if (_node.name !== targetNodeName) return;

	if (parameterData.name === 'name') {
		// Node rename - emit to parent (may need special handling)
		emit('valueChanged', {
			value: parameterData.value,
			oldValue: _node.name,
			name: 'name',
		});
		return;
	}

	if (parameterData.name === 'parameters') {
		// Full parameters object (from collections, assignments, etc.)
		// useCrdtWorkflowState will diff and only update changed paths
		workflowState.setNodeParameters({
			name: _node.name,
			value: parameterData.value as INodeParameters,
		});
		return;
	}

	if (nameIsParameter(parameterData)) {
		// Individual parameter changed (e.g., "parameters.operation")
		// Send full parameters to CRDT - it will diff and update only changed paths
		const newValue = parameterData.hasOwnProperty('value')
			? parameterData.value
			: get(nodeValues.value, parameterData.name);

		// Build updated parameters object
		const updatedParams = { ..._node.parameters };
		// parameterData.name is like "parameters.operation" - extract the param path
		const paramPath = parameterData.name.replace(/^parameters\./, '');
		set(updatedParams, paramPath, newValue);

		workflowState.setNodeParameters({
			name: _node.name,
			value: updatedParams as INodeParameters,
		});
		return;
	}

	// Node property changed (e.g., "disabled", "notes")
	workflowState.setNodeValue({
		name: _node.name,
		key: parameterData.name,
		value: parameterData.value,
	});
};

const nodeSettings = computed(() =>
	createCommonNodeSettings(isToolNode.value, i18n.baseText.bind(i18n)),
);

// Derive nodeValues - reuse collectSettings but override deep-copied parameters
const nodeValues = computed(() => {
	const result = collectSettings(props.activeNode, nodeSettings.value);
	// Override deep-copied parameters with original reference for reactivity
	result.parameters = props.activeNode.parameters;
	return result;
});

const iconSource = computed(() =>
	getNodeIconSource(nodeType.value ?? node.value?.type, node.value ?? null),
);

const onParameterBlur = (parameterName: string) => {
	hiddenIssuesInputs.value = hiddenIssuesInputs.value.filter((name) => name !== parameterName);
};

const onTabSelect = (tab: NodeSettingsTab) => {
	openPanel.value = tab;
};

const nameChanged = (name: string) => {
	// No history store in CRDT context - just emit the change
	valueChanged({
		value: name,
		name: 'name',
	});
};

onMounted(() => {
	ndvEventBus.on('updateParameterValue', valueChanged);
});

onBeforeUnmount(() => {
	ndvEventBus.off('updateParameterValue', valueChanged);
});
</script>

<template>
	<div
		:class="{
			[$style.nodeSettings]: true,
			[$style.dragging]: dragging,
		}"
		@keydown.stop
	>
		<div :class="$style.header">
			<div :class="$style.headerContent">
				<NodeTitle
					v-if="node"
					:class="$style.nodeName"
					:model-value="node.name"
					:icon-source="iconSource"
					:read-only="readOnly"
					:node-type="nodeType"
					@update:model-value="nameChanged"
				/>
				<button :class="$style.closeButton" @click="emit('close')">
					<span>×</span>
				</button>
			</div>
			<NodeSettingsTabs
				v-if="node && nodeValid"
				:model-value="openPanel"
				:node-type="nodeType"
				:push-ref="pushRef"
				@update:model-value="onTabSelect"
			/>
		</div>

		<div v-if="node && !nodeValid" :class="$style.invalidNode">
			<N8nText>Node type "{{ node.type }}" is not available.</N8nText>
		</div>

		<div v-if="node && nodeValid" :class="$style.parametersWrapper" data-test-id="node-parameters">
			<div v-show="openPanel === 'params'">
				<ParameterInputList
					:parameters="parametersByTab.params"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="readOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					:node="activeNode"
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<div v-if="showNoParametersNotice" :class="$style.noParameters">
					<N8nText>
						{{ i18n.baseText('nodeSettings.thisNodeDoesNotHaveAnyParameters') }}
					</N8nText>
				</div>
			</div>
			<div v-show="openPanel === 'settings'">
				<ParameterInputList
					:parameters="parametersByTab.settings"
					:node-values="nodeValues"
					:is-read-only="readOnly"
					:hide-delete="true"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<ParameterInputList
					:parameters="nodeSettings"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="readOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path=""
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<div :class="$style.nodeVersion" data-test-id="node-version">
					{{
						i18n.baseText('nodeSettings.nodeVersion', {
							interpolate: {
								node: nodeType?.displayName as string,
								version: (node.typeVersion ?? latestVersion).toString(),
							},
						})
					}}
				</div>
			</div>
		</div>
		<N8nBlockUi :show="blockUI" />
	</div>
</template>

<style lang="scss" module>
.nodeSettings {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color--background);
	height: 100%;
	width: 100%;
}

.dragging {
	border-color: var(--color--primary);
	box-shadow: 0 6px 16px rgba(255, 74, 51, 0.15);
}

.header {
	background-color: var(--color--background);
	border-bottom: 1px solid var(--color--foreground);
}

.headerContent {
	padding: var(--spacing--sm);
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.nodeName {
	flex: 1;
	margin-right: var(--spacing--sm);
}

.closeButton {
	background: none;
	border: none;
	font-size: 20px;
	cursor: pointer;
	color: var(--color--text--tint-1);
	padding: var(--spacing--2xs);
	line-height: 1;

	&:hover {
		color: var(--color--text);
	}
}

.invalidNode {
	padding: var(--spacing--md);
	color: var(--color--danger);
}

.parametersWrapper {
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	padding: 0 var(--spacing--sm) var(--spacing--lg) var(--spacing--sm);
	flex-grow: 1;
}

.noParameters {
	margin-top: var(--spacing--xs);
	color: var(--color--text--tint-1);
}

.nodeVersion {
	border-top: var(--border);
	font-size: var(--font-size--2xs);
	padding: var(--spacing--xs) 0 var(--spacing--2xs) 0;
	color: var(--color--text--tint-1);
}
</style>
