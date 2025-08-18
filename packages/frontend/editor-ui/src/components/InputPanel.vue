<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	CRON_NODE_TYPE,
	INTERVAL_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	NDV_UI_OVERHAUL_EXPERIMENT,
	START_NODE_TYPE,
} from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { waitingNodeTooltip } from '@/utils/executionUtils';
import uniqBy from 'lodash/uniqBy';
import { N8nIcon, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import {
	type INodeInputConfiguration,
	type INodeOutputConfiguration,
	type Workflow,
	type NodeConnectionType,
	NodeConnectionTypes,
	NodeHelpers,
} from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import InputNodeSelect from './InputNodeSelect.vue';
import NodeExecuteButton from './NodeExecuteButton.vue';
import NDVEmptyState from './NDVEmptyState.vue';
import RunData from './RunData.vue';
import WireMeUp from './WireMeUp.vue';
import { usePostHog } from '@/stores/posthog.store';
import { type IRunDataDisplayMode } from '@/Interface';
import { I18nT } from 'vue-i18n';

type MappingMode = 'debugging' | 'mapping';

export type Props = {
	runIndex: number;
	workflowObject: Workflow;
	pushRef: string;
	activeNodeName: string;
	currentNodeName?: string;
	canLinkRuns?: boolean;
	linkedRuns?: boolean;
	readOnly?: boolean;
	isProductionExecutionPreview?: boolean;
	isPaneActive?: boolean;
	displayMode: IRunDataDisplayMode;
	compact?: boolean;
	disableDisplayModeSelection?: boolean;
	focusedMappableInput: string;
	isMappingOnboarded: boolean;
	nodeNotRunMessageVariant?: 'default' | 'simple';
};

const props = withDefaults(defineProps<Props>(), {
	currentNodeName: '',
	canLinkRuns: false,
	readOnly: false,
	isProductionExecutionPreview: false,
	isPaneActive: false,
	nodeNotRunMessageVariant: 'default',
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
	displayModeChange: [IRunDataDisplayMode];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();

const showDraggableHintWithDelay = ref(false);
const draggableHintShown = ref(false);

const mappedNode = ref<string | null>(null);
const collapsingColumnName = ref<string | null>(null);
const inputModes = [
	{ value: 'mapping', label: i18n.baseText('ndv.input.mapping') },
	{ value: 'debugging', label: i18n.baseText('ndv.input.fromAI') },
];

const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const posthogStore = usePostHog();

const activeNode = computed(() => workflowsStore.getNodeByName(props.activeNodeName));

const rootNode = computed(() => {
	if (!activeNode.value) return null;

	return props.workflowObject.getChildNodes(activeNode.value.name, 'ALL').at(0) ?? null;
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

	return !!props.focusedMappableInput && !props.isMappingOnboarded;
});

const isActiveNodeConfig = computed(() => {
	let inputs = activeNodeType.value?.inputs ?? [];
	let outputs = activeNodeType.value?.outputs ?? [];

	if (props.workflowObject && activeNode.value) {
		const node = props.workflowObject.getNode(activeNode.value.name);

		if (node && activeNodeType.value) {
			inputs = NodeHelpers.getNodeInputs(props.workflowObject, node, activeNodeType.value);
			outputs = NodeHelpers.getNodeOutputs(props.workflowObject, node, activeNodeType.value);
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
	if (!workflowsStore.isWorkflowRunning) {
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

const rootNodesParents = computed(() => {
	if (!rootNode.value) return [];
	return props.workflowObject.getParentNodesByDepth(rootNode.value);
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

	const parents = props.workflowObject
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

const isNDVV2 = computed(() =>
	posthogStore.isVariantEnabled(
		NDV_UI_OVERHAUL_EXPERIMENT.name,
		NDV_UI_OVERHAUL_EXPERIMENT.variant,
	),
);

const nodeNameToExecute = computed(
	() => (isActiveNodeConfig.value ? rootNode.value : activeNode.value?.name) ?? '',
);

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

function handleChangeCollapsingColumn(columnName: string | null) {
	collapsingColumnName.value = columnName;
}
</script>

<template>
	<RunData
		:class="[$style.runData, { [$style.runDataV2]: isNDVV2 }]"
		:node="currentNode"
		:nodes="isMappingMode ? rootNodesParents : parentNodes"
		:workflow-object="workflowObject"
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
		:display-mode="displayMode"
		pane-type="input"
		data-test-id="ndv-input-panel"
		:disable-ai-content="true"
		:collapsing-table-column-name="collapsingColumnName"
		:compact="compact"
		:disable-display-mode-selection="disableDisplayModeSelection"
		@activate-pane="activatePane"
		@item-hover="onItemHover"
		@link-run="onLinkRun"
		@unlink-run="onUnlinkRun"
		@run-change="onRunIndexChange"
		@table-mounted="onTableMounted"
		@search="onSearch"
		@display-mode-change="emit('displayModeChange', $event)"
		@collapsing-table-column-changed="handleChangeCollapsingColumn"
	>
		<template #header>
			<div :class="[$style.titleSection, { [$style.titleSectionV2]: isNDVV2 }]">
				<N8nText
					:bold="true"
					color="text-light"
					:size="compact ? 'small' : 'medium'"
					:class="[$style.title, { [$style.titleV2]: isNDVV2 }]"
				>
					{{ i18n.baseText('ndv.input') }}
				</N8nText>
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
				:workflow="workflowObject"
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
					:workflow="workflowObject"
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
				<N8nText v-if="nodeNotRunMessageVariant === 'simple'" color="text-base" size="small">
					<I18nT scope="global" keypath="ndv.input.noOutputData.embeddedNdv.description">
						<template #link>
							<NodeExecuteButton
								:class="$style.executeButton"
								size="medium"
								:node-name="nodeNameToExecute"
								:label="i18n.baseText('ndv.input.noOutputData.embeddedNdv.link')"
								text
								telemetry-source="inputs"
								hide-icon
							/>
						</template>
					</I18nT>
				</N8nText>

				<template v-else-if="isNDVV2">
					<NDVEmptyState
						v-if="isMappingEnabled || hasRootNodeRun"
						:title="i18n.baseText('ndv.input.noOutputData.v2.title')"
					>
						<template #icon>
							<N8nIcon icon="arrow-right-to-line" size="xlarge" />
						</template>
						<template #description>
							<I18nT tag="span" keypath="ndv.input.noOutputData.v2.description" scope="global">
								<template #link>
									<NodeExecuteButton
										hide-icon
										transparent
										type="secondary"
										:node-name="nodeNameToExecute"
										:label="i18n.baseText('ndv.input.noOutputData.v2.action')"
										:tooltip="i18n.baseText('ndv.input.noOutputData.v2.tooltip')"
										tooltip-placement="bottom"
										telemetry-source="inputs"
										data-test-id="execute-previous-node"
										@execute="onNodeExecute"
									/>
									<br />
								</template>
							</I18nT>
						</template>
					</NDVEmptyState>
					<NDVEmptyState v-else :title="i18n.baseText('ndv.input.rootNodeHasNotRun.title')">
						<template #icon>
							<svg width="16px" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path
									d="M11 2C10.4375 2 10 1.5625 10 1C10 0.46875 10.4375 0 11 0H13C14.6562 0 16 1.34375 16 3V11C16 12.6562 14.6562 14 13 14H11C10.4375 14 10 13.5625 10 13C10 12.4688 10.4375 12 11 12H13C13.5312 12 14 11.5625 14 11V3C14 2.46875 13.5312 2 13 2H11ZM10.6875 7.71875L6.6875 11.7188C6.3125 12.125 5.65625 12.125 5.28125 11.7188C4.875 11.3438 4.875 10.6875 5.28125 10.3125L7.5625 8H1C0.4375 8 0 7.5625 0 7C0 6.46875 0.4375 6 1 6H7.5625L5.28125 3.71875C4.875 3.34375 4.875 2.6875 5.28125 2.3125C5.65625 1.90625 6.3125 1.90625 6.6875 2.3125L10.6875 6.3125C11.0938 6.6875 11.0938 7.34375 10.6875 7.71875Z"
									fill="currentColor"
								/>
							</svg>
						</template>

						<template #description>
							<I18nT tag="span" keypath="ndv.input.rootNodeHasNotRun.description" scope="global">
								<template #link>
									<a
										href="#"
										data-test-id="switch-to-mapping-mode-link"
										@click.prevent="onInputModeChange('mapping')"
									>
										{{ i18n.baseText('ndv.input.rootNodeHasNotRun.description.link') }}
									</a>
								</template>
							</I18nT>
						</template>
					</NDVEmptyState>
				</template>

				<template v-else>
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
							<I18nT tag="span" keypath="ndv.input.rootNodeHasNotRun.description" scope="global">
								<template #link>
									<a
										href="#"
										data-test-id="switch-to-mapping-mode-link"
										@click.prevent="onInputModeChange('mapping')"
										>{{ i18n.baseText('ndv.input.rootNodeHasNotRun.description.link') }}</a
									>
								</template>
							</I18nT>
						</N8nText>
					</template>
					<NodeExecuteButton
						v-if="!readOnly"
						type="secondary"
						hide-icon
						:transparent="true"
						:node-name="nodeNameToExecute"
						:label="i18n.baseText('ndv.input.noOutputData.executePrevious')"
						class="mt-m"
						telemetry-source="inputs"
						data-test-id="execute-previous-node"
						tooltip-placement="bottom"
						@execute="onNodeExecute"
					>
						<template
							v-if="showDraggableHint && showDraggableHintWithDelay"
							#persistentTooltipContent
						>
							<div
								v-n8n-html="
									i18n.baseText('dataMapping.dragFromPreviousHint', {
										interpolate: { name: focusedMappableInput },
									})
								"
							></div>
						</template>
					</NodeExecuteButton>
					<N8nText v-if="!readOnly" tag="div" size="small">
						<I18nT keypath="ndv.input.noOutputData.hint" scope="global">
							<template #info>
								<N8nTooltip placement="bottom">
									<template #content>
										{{ i18n.baseText('ndv.input.noOutputData.hint.tooltip') }}
									</template>
									<N8nIcon icon="circle-help" />
								</N8nTooltip>
							</template>
						</I18nT>
					</N8nText>
				</template>
			</div>
			<div v-else :class="$style.notConnected">
				<NDVEmptyState v-if="isNDVV2" :title="i18n.baseText('ndv.input.notConnected.v2.title')">
					<template #icon>
						<WireMeUp />
					</template>
					<template #description>
						<I18nT tag="span" keypath="ndv.input.notConnected.v2.description" scope="global">
							<template #link>
								<a
									href="https://docs.n8n.io/workflows/connections/"
									target="_blank"
									@click="onConnectionHelpClick"
								>
									{{ i18n.baseText('ndv.input.notConnected.learnMore') }}
								</a>
							</template>
						</I18nT>
					</template>
				</NDVEmptyState>

				<template v-else>
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
				</template>
			</div>
		</template>

		<template #node-waiting>
			<N8nText :bold="true" color="text-dark" size="large">
				{{ i18n.baseText('ndv.output.waitNodeWaiting.title') }}
			</N8nText>
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

.runDataV2 {
	background-color: var(--color-ndvv2-run-data-background);
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

.titleSectionV2 {
	padding-left: var(--spacing-4xs);
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
	letter-spacing: 3px;
}

.titleV2 {
	letter-spacing: 2px;
	font-size: var(--font-size-xs);
}

.executeButton {
	padding: 0;
}
</style>
