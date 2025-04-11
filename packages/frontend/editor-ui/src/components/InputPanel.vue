<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	CRON_NODE_TYPE,
	INTERVAL_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	START_NODE_TYPE,
} from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { waitingNodeTooltip } from '@/utils/executionUtils';
import { uniqBy } from 'lodash-es';
import { N8nIcon, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import type { INodeInputConfiguration, INodeOutputConfiguration, Workflow } from 'n8n-workflow';
import { type NodeConnectionType, NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useNDVStore } from '../stores/ndv.store';
import InputNodeSelect from './InputNodeSelect.vue';
import NodeExecuteButton from './NodeExecuteButton.vue';
import RunData from './RunData.vue';
import WireMeUp from './WireMeUp.vue';

type MappingMode = 'debugging' | 'mapping';

export type Props = {
	runIndex: number;
	workflow: Workflow;
	pushRef: string;
	currentNodeName?: string;
	canLinkRuns?: boolean;
	linkedRuns?: boolean;
	readOnly?: boolean;
	isProductionExecutionPreview?: boolean;
	isPaneActive?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	currentNodeName: '',
	canLinkRuns: false,
	readOnly: false,
	isProductionExecutionPreview: false,
	isPaneActive: false,
});

const emit = defineEmits<{
	itemHover: [
		{
			outputIndex: number;
			itemIndex: number;
		} | null,
	];
	tableMounted: [
		{
			avgRowHeight: number;
		},
	];
	linkRun: [];
	unlinkRun: [];
	runChange: [runIndex: number];
	search: [search: string];
	changeInputNode: [nodeName: string, index: number];
	execute: [];
	activatePane: [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();

const showDraggableHintWithDelay = ref(false);
const draggableHintShown = ref(false);

const mappedNode = ref<string | null>(null);
const inputModes = [
	{ value: 'mapping', label: i18n.baseText('ndv.input.mapping') },
	{ value: 'debugging', label: i18n.baseText('ndv.input.debugging') },
];

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();

const {
	activeNode,
	focusedMappableInput,
	isMappingOnboarded: isUserOnboarded,
} = storeToRefs(ndvStore);

const rootNode = computed(() => {
	if (!activeNode.value) return null;

	return props.workflow.getChildNodes(activeNode.value.name, 'ALL').at(0) ?? null;
});

const hasRootNodeRun = computed(() => {
	return !!(
		rootNode.value && workflowsStore.getWorkflowExecution?.data?.resultData.runData[rootNode.value]
	);
});

const inputMode = ref<MappingMode>(
	// Show debugging mode by default only when the node has already run
	activeNode.value &&
		workflowsStore.getWorkflowExecution?.data?.resultData.runData[activeNode.value.name]
		? 'debugging'
		: 'mapping',
);

const isMappingMode = computed(() => isActiveNodeConfig.value && inputMode.value === 'mapping');
const showDraggableHint = computed(() => {
	const toIgnore = [START_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE, CRON_NODE_TYPE, INTERVAL_NODE_TYPE];
	if (!currentNode.value || toIgnore.includes(currentNode.value.type)) {
		return false;
	}

	return !!focusedMappableInput.value && !isUserOnboarded.value;
});

const isActiveNodeConfig = computed(() => {
	let inputs = activeNodeType.value?.inputs ?? [];
	let outputs = activeNodeType.value?.outputs ?? [];

	if (props.workflow && activeNode.value) {
		const node = props.workflow.getNode(activeNode.value.name);

		if (node && activeNodeType.value) {
			inputs = NodeHelpers.getNodeInputs(props.workflow, node, activeNodeType.value);
			outputs = NodeHelpers.getNodeOutputs(props.workflow, node, activeNodeType.value);
		}
	}

	// If we can not figure out the node type we set no outputs
	if (!Array.isArray(inputs)) {
		inputs = [];
	}

	if (!Array.isArray(outputs)) {
		outputs = [];
	}

	return (
		inputs.length === 0 ||
		(inputs.every((input) => filterOutConnectionType(input, NodeConnectionTypes.Main)) &&
			outputs.find((output) => filterOutConnectionType(output, NodeConnectionTypes.Main)))
	);
});

const isMappingEnabled = computed(() => {
	if (props.readOnly) return false;

	// Mapping is only enabled in mapping mode for config nodes and if node to map is selected
	if (isActiveNodeConfig.value) return isMappingMode.value && mappedNode.value !== null;

	return true;
});
const isExecutingPrevious = computed(() => {
	if (!workflowRunning.value) {
		return false;
	}
	const triggeredNode = workflowsStore.executedNode;
	const executingNode = workflowsStore.executingNode;

	if (
		activeNode.value &&
		triggeredNode === activeNode.value.name &&
		workflowsStore.isNodeExecuting(props.currentNodeName)
	) {
		return true;
	}

	if (executingNode.length || triggeredNode) {
		return !!parentNodes.value.find(
			(node) => workflowsStore.isNodeExecuting(node.name) || node.name === triggeredNode,
		);
	}
	return false;
});
const workflowRunning = computed(() => uiStore.isActionActive.workflowRunning);

const rootNodesParents = computed(() => {
	if (!rootNode.value) return [];
	return props.workflow.getParentNodesByDepth(rootNode.value);
});

const currentNode = computed(() => {
	if (isActiveNodeConfig.value) {
		// if we're mapping node we want to show the output of the mapped node
		if (mappedNode.value) {
			return workflowsStore.getNodeByName(mappedNode.value);
		}

		// in debugging mode data does get set manually and is only for debugging
		// so we want to force the node to be the active node to make sure we show the correct data
		return activeNode.value;
	}

	return workflowsStore.getNodeByName(props.currentNodeName ?? '');
});

const connectedCurrentNodeOutputs = computed(() => {
	const search = parentNodes.value.find(({ name }) => name === props.currentNodeName);
	return search?.indicies;
});
const parentNodes = computed(() => {
	if (!activeNode.value) {
		return [];
	}

	const parents = props.workflow
		.getParentNodesByDepth(activeNode.value.name)
		.filter((parent) => parent.name !== activeNode.value?.name);
	return uniqBy(parents, (parent) => parent.name);
});

const currentNodeDepth = computed(() => {
	const node = parentNodes.value.find(
		(parent) => currentNode.value && parent.name === currentNode.value.name,
	);
	return node?.depth ?? -1;
});

const activeNodeType = computed(() => {
	if (!activeNode.value) return null;
	return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
});

const waitingMessage = computed(() => {
	const parentNode = parentNodes.value[0];
	return parentNode && waitingNodeTooltip(workflowsStore.getNodeByName(parentNode.name));
});

watch(
	inputMode,
	(mode) => {
		onRunIndexChange(-1);
		if (mode === 'mapping') {
			onUnlinkRun();
			mappedNode.value = rootNodesParents.value[0]?.name ?? null;
		} else {
			mappedNode.value = null;
		}
	},
	{ immediate: true },
);

watch(showDraggableHint, (curr, prev) => {
	if (curr && !prev) {
		setTimeout(() => {
			if (draggableHintShown.value) {
				return;
			}
			showDraggableHintWithDelay.value = showDraggableHint.value;
			if (showDraggableHintWithDelay.value) {
				draggableHintShown.value = true;

				telemetry.track('User viewed data mapping tooltip', {
					type: 'unexecuted input pane',
				});
			}
		}, 1000);
	} else if (!curr) {
		showDraggableHintWithDelay.value = false;
	}
});

function filterOutConnectionType(
	item: NodeConnectionType | INodeOutputConfiguration | INodeInputConfiguration,
	type: NodeConnectionType,
) {
	if (!item) return false;

	return typeof item === 'string' ? item !== type : item.type !== type;
}

function onInputModeChange(val: string) {
	inputMode.value = val as MappingMode;
}

function onMappedNodeSelected(val: string) {
	mappedNode.value = val;

	onRunIndexChange(0);
	onUnlinkRun();
}

function onNodeExecute() {
	emit('execute');
	if (activeNode.value) {
		telemetry.track('User clicked ndv button', {
			node_type: activeNode.value.type,
			workflow_id: workflowsStore.workflowId,
			push_ref: props.pushRef,
			pane: 'input',
			type: 'executePrevious',
		});
	}
}

function onRunIndexChange(run: number) {
	emit('runChange', run);
}

function onLinkRun() {
	emit('linkRun');
}

function onUnlinkRun() {
	emit('unlinkRun');
}

function onSearch(search: string) {
	emit('search', search);
}

function onItemHover(
	item: {
		outputIndex: number;
		itemIndex: number;
	} | null,
) {
	emit('itemHover', item);
}

function onTableMounted(event: { avgRowHeight: number }) {
	emit('tableMounted', event);
}

function onInputNodeChange(value: string) {
	const index = parentNodes.value.findIndex((node) => node.name === value) + 1;
	emit('changeInputNode', value, index);
}

function onConnectionHelpClick() {
	if (activeNode.value) {
		telemetry.track('User clicked ndv link', {
			node_type: activeNode.value.type,
			workflow_id: workflowsStore.workflowId,
			push_ref: props.pushRef,
			pane: 'input',
			type: 'not-connected-help',
		});
	}
}

function activatePane() {
	emit('activatePane');
}
</script>

<template>
	<RunData
		:class="$style.runData"
		:node="currentNode"
		:nodes="isMappingMode ? rootNodesParents : parentNodes"
		:workflow="workflow"
		:run-index="isMappingMode ? 0 : runIndex"
		:linked-runs="linkedRuns"
		:can-link-runs="!mappedNode && canLinkRuns"
		:too-much-data-title="i18n.baseText('ndv.input.tooMuchData.title')"
		:no-data-in-branch-message="i18n.baseText('ndv.input.noOutputDataInBranch')"
		:is-executing="isExecutingPrevious"
		:executing-message="i18n.baseText('ndv.input.executingPrevious')"
		:push-ref="pushRef"
		:override-outputs="connectedCurrentNodeOutputs"
		:mapping-enabled="isMappingEnabled"
		:distance-from-active="currentNodeDepth"
		:is-production-execution-preview="isProductionExecutionPreview"
		:is-pane-active="isPaneActive"
		pane-type="input"
		data-test-id="ndv-input-panel"
		@activate-pane="activatePane"
		@item-hover="onItemHover"
		@link-run="onLinkRun"
		@unlink-run="onUnlinkRun"
		@run-change="onRunIndexChange"
		@table-mounted="onTableMounted"
		@search="onSearch"
	>
		<template #header>
			<div :class="$style.titleSection">
				<span :class="$style.title">{{ i18n.baseText('ndv.input') }}</span>
				<N8nRadioButtons
					v-if="isActiveNodeConfig && !readOnly"
					data-test-id="input-panel-mode"
					:options="inputModes"
					:model-value="inputMode"
					@update:model-value="onInputModeChange"
				/>
			</div>
		</template>
		<template #input-select>
			<InputNodeSelect
				v-if="parentNodes.length && currentNodeName"
				:model-value="currentNodeName"
				:workflow="workflow"
				:nodes="parentNodes"
				@update:model-value="onInputNodeChange"
			/>
		</template>
		<template v-if="isMappingMode" #before-data>
			<!--
						Hide the run linking buttons for both input and ouput panels when in 'Mapping Mode' because the run indices wouldn't match.
						Although this is not the most elegant solution, it's straightforward and simpler than introducing a new props and logic to handle this.
				-->
			<component :is="'style'">button.linkRun { display: none }</component>
			<div :class="$style.mappedNode">
				<InputNodeSelect
					:model-value="mappedNode"
					:workflow="workflow"
					:nodes="rootNodesParents"
					@update:model-value="onMappedNodeSelected"
				/>
			</div>
		</template>
		<template #node-not-run>
			<div
				v-if="(isActiveNodeConfig && rootNode) || parentNodes.length"
				:class="$style.noOutputData"
			>
				<template v-if="isMappingEnabled || hasRootNodeRun">
					<N8nText tag="div" :bold="true" color="text-dark" size="large">{{
						i18n.baseText('ndv.input.noOutputData.title')
					}}</N8nText>
				</template>
				<template v-else>
					<N8nText tag="div" :bold="true" color="text-dark" size="large">{{
						i18n.baseText('ndv.input.rootNodeHasNotRun.title')
					}}</N8nText>
					<N8nText tag="div" color="text-dark" size="medium">
						<i18n-t tag="span" keypath="ndv.input.rootNodeHasNotRun.description">
							<template #link>
								<a
									href="#"
									data-test-id="switch-to-mapping-mode-link"
									@click.prevent="onInputModeChange('mapping')"
									>{{ i18n.baseText('ndv.input.rootNodeHasNotRun.description.link') }}</a
								>
							</template>
						</i18n-t>
					</N8nText>
				</template>
				<N8nTooltip v-if="!readOnly" :visible="showDraggableHint && showDraggableHintWithDelay">
					<template #content>
						<div
							v-n8n-html="
								i18n.baseText('dataMapping.dragFromPreviousHint', {
									interpolate: { name: focusedMappableInput },
								})
							"
						></div>
					</template>
					<NodeExecuteButton
						type="secondary"
						hide-icon
						:transparent="true"
						:node-name="(isActiveNodeConfig ? rootNode : currentNodeName) ?? ''"
						:label="i18n.baseText('ndv.input.noOutputData.executePrevious')"
						class="mt-m"
						telemetry-source="inputs"
						data-test-id="execute-previous-node"
						@execute="onNodeExecute"
					/>
				</N8nTooltip>
				<N8nText v-if="!readOnly" tag="div" size="small">
					<i18n-t keypath="ndv.input.noOutputData.hint">
						<template #info>
							<N8nTooltip placement="bottom">
								<template #content>
									{{ i18n.baseText('ndv.input.noOutputData.hint.tooltip') }}
								</template>
								<N8nIcon icon="question-circle" />
							</N8nTooltip>
						</template>
					</i18n-t>
				</N8nText>
			</div>
			<div v-else :class="$style.notConnected">
				<div>
					<WireMeUp />
				</div>
				<N8nText tag="div" :bold="true" color="text-dark" size="large">{{
					i18n.baseText('ndv.input.notConnected.title')
				}}</N8nText>
				<N8nText tag="div">
					{{ i18n.baseText('ndv.input.notConnected.message') }}
					<a
						href="https://docs.n8n.io/workflows/connections/"
						target="_blank"
						@click="onConnectionHelpClick"
					>
						{{ i18n.baseText('ndv.input.notConnected.learnMore') }}
					</a>
				</N8nText>
			</div>
		</template>

		<template #node-waiting>
			<N8nText :bold="true" color="text-dark" size="large">Waiting for input</N8nText>
			<N8nText v-n8n-html="waitingMessage"></N8nText>
		</template>

		<template #no-output-data>
			<N8nText tag="div" :bold="true" color="text-dark" size="large">{{
				i18n.baseText('ndv.input.noOutputData')
			}}</N8nText>
		</template>

		<template #recovered-artificial-output-data>
			<div :class="$style.recoveredOutputData">
				<N8nText tag="div" :bold="true" color="text-dark" size="large">{{
					i18n.baseText('executionDetails.executionFailed.recoveredNodeTitle')
				}}</N8nText>
				<N8nText>
					{{ i18n.baseText('executionDetails.executionFailed.recoveredNodeMessage') }}
				</N8nText>
			</div>
		</template>
	</RunData>
</template>

<style lang="scss" module>
.runData {
	background-color: var(--color-run-data-background);
}

.mappedNode {
	padding: 0 var(--spacing-s) var(--spacing-s);
}

.titleSection {
	display: flex;
	max-width: 300px;
	align-items: center;

	> * {
		margin-right: var(--spacing-2xs);
	}
}
.inputModeTab {
	margin-left: auto;
}
.noOutputData {
	max-width: 250px;

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.recoveredOutputData {
	margin: auto;
	max-width: 250px;
	text-align: center;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}
}

.notConnected {
	max-width: 300px;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 3px;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
}
</style>
