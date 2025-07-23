<script setup lang="ts">
import { ViewableMimeTypes } from '@n8n/api-types';
import { useStorage } from '@/composables/useStorage';
import { saveAs } from 'file-saver';
import NodeSettingsHint from '@/components/NodeSettingsHint.vue';
import type {
	IBinaryData,
	IConnectedNode,
	IDataObject,
	INodeExecutionData,
	INodeOutputConfiguration,
	IRunData,
	IRunExecutionData,
	ITaskMetadata,
	NodeError,
	NodeHint,
	Workflow,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	parseErrorMetadata,
	NodeConnectionTypes,
	NodeHelpers,
	TRIMMED_TASK_DATA_CONNECTIONS_KEY,
} from 'n8n-workflow';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';

import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IRunDataDisplayMode,
	ITab,
	NodePanelType,
} from '@/Interface';

import {
	CORE_NODES_CATEGORY,
	DATA_EDITING_DOCS_URL,
	DATA_PINNING_DOCS_URL,
	HTML_NODE_TYPE,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG,
	MAX_DISPLAY_DATA_SIZE,
	MAX_DISPLAY_DATA_SIZE_SCHEMA_VIEW,
	NDV_UI_OVERHAUL_EXPERIMENT,
	NODE_TYPES_EXCLUDED_FROM_OUTPUT_NAME_APPEND,
	RUN_DATA_DEFAULT_PAGE_SIZE,
	TEST_PIN_DATA,
} from '@/constants';

import BinaryDataDisplay from '@/components/BinaryDataDisplay.vue';
import NodeErrorView from '@/components/Error/NodeErrorView.vue';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';

import RunDataPinButton from '@/components/RunDataPinButton.vue';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useNodeType } from '@/composables/useNodeType';
import type { PinDataSource, UnpinDataSource } from '@/composables/usePinnedData';
import { usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { dataPinningEventBus, ndvEventBus } from '@/event-bus';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { getGenericHints } from '@/utils/nodeViewUtils';
import { searchInObject } from '@/utils/objectUtils';
import { clearJsonKey, isEmpty, isPresent } from '@/utils/typesUtils';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import {
	N8nBlockUi,
	N8nButton,
	N8nCallout,
	N8nIconButton,
	N8nInfoTip,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nSpinner,
	N8nTabs,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useUIStore } from '@/stores/ui.store';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';
import { asyncComputed } from '@vueuse/core';
import ViewSubExecution from './ViewSubExecution.vue';
import RunDataItemCount from '@/components/RunDataItemCount.vue';
import RunDataDisplayModeSelect from '@/components/RunDataDisplayModeSelect.vue';
import RunDataPaginationBar from '@/components/RunDataPaginationBar.vue';
import { parseAiContent } from '@/utils/aiUtils';
import { usePostHog } from '@/stores/posthog.store';
import { I18nT } from 'vue-i18n';

const LazyRunDataTable = defineAsyncComponent(
	async () => await import('@/components/RunDataTable.vue'),
);
const LazyRunDataJson = defineAsyncComponent(
	async () => await import('@/components/RunDataJson.vue'),
);

const LazyRunDataSchema = defineAsyncComponent(
	async () => await import('@/components/VirtualSchema.vue'),
);
const LazyRunDataHtml = defineAsyncComponent(
	async () => await import('@/components/RunDataHtml.vue'),
);
const LazyRunDataAi = defineAsyncComponent(
	async () => await import('@/components/RunDataParsedAiContent.vue'),
);
const LazyRunDataSearch = defineAsyncComponent(
	async () => await import('@/components/RunDataSearch.vue'),
);

export type EnterEditModeArgs = {
	origin: 'editIconButton' | 'insertTestDataLink';
};

type Props = {
	workflow: Workflow;
	workflowExecution?: IRunExecutionData;
	runIndex: number;
	tooMuchDataTitle: string;
	executingMessage: string;
	pushRef?: string;
	paneType: NodePanelType;
	displayMode: IRunDataDisplayMode;
	noDataInBranchMessage: string;
	node?: INodeUi | null;
	nodes?: IConnectedNode[];
	linkedRuns?: boolean;
	canLinkRuns?: boolean;
	isExecuting?: boolean;
	overrideOutputs?: number[];
	mappingEnabled?: boolean;
	distanceFromActive?: number;
	blockUI?: boolean;
	isProductionExecutionPreview?: boolean;
	isPaneActive?: boolean;
	hidePagination?: boolean;
	calloutMessage?: string;
	disableRunIndexSelection?: boolean;
	disableDisplayModeSelection?: boolean;
	disableEdit?: boolean;
	disablePin?: boolean;
	compact?: boolean;
	tableHeaderBgColor?: 'base' | 'light';
	disableHoverHighlight?: boolean;
	disableAiContent?: boolean;
	collapsingTableColumnName: string | null;
};

const props = withDefaults(defineProps<Props>(), {
	node: null,
	nodes: () => [],
	overrideOutputs: undefined,
	distanceFromActive: 0,
	blockUI: false,
	isPaneActive: false,
	isProductionExecutionPreview: false,
	mappingEnabled: false,
	isExecuting: false,
	hidePagination: false,
	calloutMessage: undefined,
	disableRunIndexSelection: false,
	disableDisplayModeSelection: false,
	disableEdit: false,
	disablePin: false,
	disableHoverHighlight: false,
	compact: false,
	tableHeaderBgColor: 'base',
	workflowExecution: undefined,
	disableAiContent: false,
});

defineSlots<{
	content: {};
	'callout-message': {};
	header: {};
	'input-select': {};
	'before-data': {};
	'run-info': {};
	'node-waiting': {};
	'node-not-run': {};
	'no-output-data': {};
	'recovered-artificial-output-data': {};
}>();

const emit = defineEmits<{
	search: [search: string];
	runChange: [runIndex: number];
	itemHover: [
		item: {
			outputIndex: number;
			itemIndex: number;
		} | null,
	];
	linkRun: [];
	unlinkRun: [];
	activatePane: [];
	tableMounted: [
		{
			avgRowHeight: number;
		},
	];
	displayModeChange: [IRunDataDisplayMode];
	collapsingTableColumnChanged: [columnName: string | null];
}>();

const connectionType = ref<NodeConnectionType>(NodeConnectionTypes.Main);
const dataSize = ref(0);
const showData = ref(false);
const userEnabledShowData = ref(false);
const outputIndex = ref(0);
const binaryDataDisplayVisible = ref(false);
const binaryDataDisplayData = ref<IBinaryData | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);

const pinDataDiscoveryTooltipVisible = ref(false);
const isControlledPinDataTooltip = ref(false);
const search = ref('');

const dataContainerRef = ref<HTMLDivElement>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const sourceControlStore = useSourceControlStore();
const rootStore = useRootStore();
const uiStore = useUIStore();
const schemaPreviewStore = useSchemaPreviewStore();
const posthogStore = usePostHog();

const toast = useToast();
const route = useRoute();
const nodeHelpers = useNodeHelpers();
const externalHooks = useExternalHooks();
const telemetry = useTelemetry();
const i18n = useI18n();

const node = toRef(props, 'node');

const pinnedData = usePinnedData(node, {
	runIndex: props.runIndex,
	displayMode: props.displayMode,
});
const { isSubNodeType } = useNodeType({
	node,
});

const isArchivedWorkflow = computed(() => workflowsStore.workflow.isArchived);
const isReadOnlyRoute = computed(() => route.meta.readOnlyCanvas === true);
const isWaitNodeWaiting = computed(() => {
	return (
		node.value?.name &&
		workflowExecution.value?.resultData?.runData?.[node.value?.name]?.[props.runIndex]
			?.executionStatus === 'waiting'
	);
});

const { activeNode } = storeToRefs(ndvStore);
const nodeType = computed(() => {
	if (!node.value) return null;

	return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
});

const isSchemaView = computed(() => props.displayMode === 'schema');
const isSearchInSchemaView = computed(() => isSchemaView.value && !!search.value);
const hasMultipleInputNodes = computed(() => props.paneType === 'input' && props.nodes.length > 0);
const displaysMultipleNodes = computed(() => isSchemaView.value && hasMultipleInputNodes.value);

const isTriggerNode = computed(() => !!node.value && nodeTypesStore.isTriggerNode(node.value.type));

const canPinData = computed(
	() =>
		!!node.value &&
		pinnedData.canPinNode(false, currentOutputIndex.value) &&
		!isPaneTypeInput.value &&
		pinnedData.isValidNodeType.value &&
		!(binaryData.value && binaryData.value.length > 0),
);

const hasNodeRun = computed(() =>
	Boolean(
		!props.isExecuting &&
			node.value &&
			((workflowRunData.value && workflowRunData.value.hasOwnProperty(node.value.name)) ||
				pinnedData.hasData.value),
	),
);

const isArtificialRecoveredEventItem = computed(
	() => rawInputData.value?.[0]?.json?.isArtificialRecoveredEventItem,
);

const isTrimmedManualExecutionDataItem = computed(
	() => rawInputData.value?.[0]?.json?.[TRIMMED_TASK_DATA_CONNECTIONS_KEY],
);

const subworkflowExecutionError = computed(() => {
	if (!node.value) return null;
	return {
		node: node.value,
		messages: [workflowsStore.subWorkflowExecutionError?.message ?? ''],
	} as NodeError;
});

const hasSubworkflowExecutionError = computed(() => !!workflowsStore.subWorkflowExecutionError);

// Sub-nodes may wish to display the parent node error as it can contain additional metadata
const parentNodeError = computed(() => {
	const parentNode = props.workflow.getChildNodes(node.value?.name ?? '', 'ALL_NON_MAIN')[0];
	return workflowRunData.value?.[parentNode]?.[props.runIndex]?.error as NodeError;
});
const workflowRunErrorAsNodeError = computed(() => {
	if (!node.value) {
		return null;
	}

	// If the node is a sub-node, we need to get the parent node error to check for input errors
	if (isSubNodeType.value && props.paneType === 'input') {
		return parentNodeError.value;
	}
	return workflowRunData.value?.[node.value?.name]?.[props.runIndex]?.error as NodeError;
});

const hasRunError = computed(() => Boolean(node.value && workflowRunErrorAsNodeError.value));

const executionHints = computed(() => {
	if (hasNodeRun.value) {
		const hints = node.value && workflowRunData.value?.[node.value.name]?.[props.runIndex]?.hints;

		if (hints) return hints;
	}

	return [];
});

const workflowExecution = computed(
	() => props.workflowExecution ?? workflowsStore.getWorkflowExecution?.data ?? undefined,
);
const workflowRunData = computed(() => {
	if (workflowExecution.value === undefined) {
		return null;
	}
	const executionData: IRunExecutionData | undefined = workflowExecution.value;
	if (executionData?.resultData) {
		return executionData.resultData.runData;
	}
	return null;
});
const dataCount = computed(() =>
	getDataCount(props.runIndex, currentOutputIndex.value, connectionType.value),
);

const unfilteredDataCount = computed(() =>
	pinnedData.data.value ? pinnedData.data.value.length : rawInputData.value.length,
);
const dataSizeInMB = computed(() => (dataSize.value / (1024 * 1024)).toFixed(1));
const maxOutputIndex = computed(() => {
	if (node.value === null || props.runIndex === undefined) {
		return 0;
	}

	const runData: IRunData | null = workflowRunData.value;

	if (!runData?.hasOwnProperty(node.value.name)) {
		return 0;
	}

	if (runData[node.value.name].length < props.runIndex) {
		return 0;
	}

	if (runData[node.value.name][props.runIndex]) {
		const taskData = runData[node.value.name][props.runIndex].data;
		if (taskData?.main) {
			return taskData.main.length - 1;
		}
	}

	return 0;
});
const currentPageOffset = computed(() => pageSize.value * (currentPage.value - 1));
const maxRunIndex = computed(() => {
	if (!node.value) {
		return 0;
	}

	const runData: IRunData | null = workflowRunData.value;

	if (!runData?.hasOwnProperty(node.value.name)) {
		return 0;
	}

	if (runData[node.value.name].length) {
		return runData[node.value.name].length - 1;
	}

	return 0;
});

const rawInputData = computed(() =>
	getRawInputData(props.runIndex, currentOutputIndex.value, connectionType.value),
);

const unfilteredInputData = computed(() => getPinDataOrLiveData(rawInputData.value));
const inputData = computed(() => getFilteredData(unfilteredInputData.value));
const inputDataPage = computed(() => {
	const offset = pageSize.value * (currentPage.value - 1);
	return inputData.value.slice(offset, offset + pageSize.value);
});
const jsonData = computed(() => executionDataToJson(inputData.value));
const binaryData = computed(() => {
	if (!node.value) {
		return [];
	}

	return nodeHelpers
		.getBinaryData(workflowRunData.value, node.value.name, props.runIndex, currentOutputIndex.value)
		.filter((data) => Boolean(data && Object.keys(data).length));
});
const inputHtml = computed(() => String(inputData.value[0]?.json?.html ?? ''));
const currentOutputIndex = computed(() => {
	if (props.overrideOutputs?.length && !props.overrideOutputs.includes(outputIndex.value)) {
		return props.overrideOutputs[0];
	}

	// In some cases nodes may switch their outputCount while the user still
	// has a higher outputIndex selected. We could adjust outputIndex directly,
	// but that loses data as we can keep the user selection if the branch reappears.
	return Math.min(outputIndex.value, maxOutputIndex.value);
});
const branches = computed(() => {
	const capitalize = (name: string) => name.charAt(0).toLocaleUpperCase() + name.slice(1);

	const result: Array<ITab<number>> = [];

	for (let i = 0; i <= maxOutputIndex.value; i++) {
		if (props.overrideOutputs && !props.overrideOutputs.includes(i)) {
			continue;
		}
		const totalItemsCount = getRawInputData(props.runIndex, i).length;
		const itemsCount = getDataCount(props.runIndex, i);
		const items = search.value
			? i18n.baseText('ndv.search.items', {
					adjustToNumber: totalItemsCount,
					interpolate: { matched: itemsCount, total: totalItemsCount },
				})
			: i18n.baseText('ndv.output.items', {
					adjustToNumber: itemsCount,
					interpolate: { count: itemsCount },
				});
		let outputName = getOutputName(i);

		if (`${outputName}` === `${i}`) {
			outputName = `${i18n.baseText('ndv.output')} ${outputName}`;
		} else {
			const appendBranchWord = NODE_TYPES_EXCLUDED_FROM_OUTPUT_NAME_APPEND.includes(
				node.value?.type ?? '',
			)
				? ''
				: ` ${i18n.baseText('ndv.output.branch')}`;
			outputName = capitalize(`${getOutputName(i)}${appendBranchWord}`);
		}
		result.push({
			label:
				(search.value && itemsCount) || totalItemsCount ? `${outputName} (${items})` : outputName,
			value: i,
		});
	}
	return result;
});

const editMode = computed(() => {
	return isPaneTypeInput.value ? { enabled: false, value: '' } : ndvStore.outputPanelEditMode;
});

const isPaneTypeInput = computed(() => props.paneType === 'input');
const isPaneTypeOutput = computed(() => props.paneType === 'output');

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
const showIOSearch = computed(
	() =>
		hasNodeRun.value &&
		!hasRunError.value &&
		(unfilteredInputData.value.length > 0 || displaysMultipleNodes.value),
);
const inputSelectLocation = computed(() => {
	if (isSchemaView.value) return 'none';
	if (!hasNodeRun.value) return 'header';
	if (maxRunIndex.value > 0) return 'runs';
	if (maxOutputIndex.value > 0 && branches.value.length > 1) {
		return 'outputs';
	}

	return 'items';
});

const showIoSearchNoMatchContent = computed(
	() =>
		hasNodeRun.value && !inputData.value.length && !!search.value && !displaysMultipleNodes.value,
);

const parentNodeOutputData = computed(() => {
	const parentNode = props.workflow.getParentNodesByDepth(node.value?.name ?? '')[0];
	let parentNodeData: INodeExecutionData[] = [];

	if (parentNode?.name) {
		parentNodeData = nodeHelpers.getNodeInputData(
			props.workflow.getNode(parentNode?.name),
			props.runIndex,
			outputIndex.value,
			'input',
			connectionType.value,
		);
	}

	return parentNodeData;
});

const parentNodePinnedData = computed(() => {
	const parentNode = props.workflow.getParentNodesByDepth(node.value?.name ?? '')[0];
	return props.workflow.pinData?.[parentNode?.name || ''] ?? [];
});

const showPinButton = computed(() => {
	if (props.disablePin) {
		return false;
	}
	if (!rawInputData.value.length && !pinnedData.hasData.value) {
		return false;
	}
	if (editMode.value.enabled) {
		return false;
	}
	if (binaryData.value?.length) {
		return isPaneTypeOutput.value;
	}
	return canPinData.value;
});

const pinButtonDisabled = computed(
	() =>
		(!rawInputData.value.length && !pinnedData.hasData.value) ||
		!!binaryData.value?.length ||
		isReadOnlyRoute.value ||
		readOnlyEnv.value ||
		isArchivedWorkflow.value,
);

const activeTaskMetadata = computed((): ITaskMetadata | null => {
	if (!node.value) {
		return null;
	}
	const errorMetadata = parseErrorMetadata(workflowRunErrorAsNodeError.value);
	if (errorMetadata !== undefined) {
		return errorMetadata;
	}

	// This is needed for the WorkflowRetriever to display the associated execution
	if (parentNodeError.value) {
		const subNodeMetadata = parseErrorMetadata(parentNodeError.value);
		if (subNodeMetadata !== undefined) {
			return subNodeMetadata;
		}
	}

	return workflowRunData.value?.[node.value.name]?.[props.runIndex]?.metadata ?? null;
});

const hasInputOverwrite = computed((): boolean => {
	if (!node.value) {
		return false;
	}
	const taskData = nodeHelpers.getNodeTaskData(node.value.name, props.runIndex);
	return Boolean(taskData?.inputOverride);
});

const isSchemaPreviewEnabled = computed(
	() =>
		props.paneType === 'input' &&
		!(nodeType.value?.codex?.categories ?? []).some((category) => category === CORE_NODES_CATEGORY),
);

const isNDVV2 = computed(() =>
	posthogStore.isVariantEnabled(
		NDV_UI_OVERHAUL_EXPERIMENT.name,
		NDV_UI_OVERHAUL_EXPERIMENT.variant,
	),
);

const hasPreviewSchema = asyncComputed(async () => {
	if (!isSchemaPreviewEnabled.value || props.nodes.length === 0) return false;
	const nodes = props.nodes
		.filter((n) => n.depth === 1)
		.map((n) => workflowsStore.getNodeByName(n.name))
		.filter(isPresent);

	for (const connectedNode of nodes) {
		const { type, typeVersion, parameters } = connectedNode;
		const hasPreview = await schemaPreviewStore.getSchemaPreview({
			nodeType: type,
			version: typeVersion,
			resource: parameters.resource as string,
			operation: parameters.operation as string,
		});

		if (hasPreview.ok) return true;
	}
	return false;
}, false);

const itemsCountProps = computed<InstanceType<typeof RunDataItemCount>['$props']>(() => ({
	search: search.value,
	dataCount: dataCount.value,
	unfilteredDataCount: unfilteredDataCount.value,
	subExecutionsCount: activeTaskMetadata.value?.subExecutionsCount,
}));

const parsedAiContent = computed(() =>
	props.disableAiContent ? [] : parseAiContent(rawInputData.value, connectionType.value),
);

const hasParsedAiContent = computed(() =>
	parsedAiContent.value.some((prr) => prr.parsedContent?.parsed),
);

function setInputBranchIndex(value: number) {
	if (props.paneType === 'input') {
		outputIndex.value = value;
	}
}

watch(node, (newNode, prevNode) => {
	if (newNode?.id === prevNode?.id) return;
	init();
});

watch(hasNodeRun, () => {
	if (props.paneType === 'output') setDisplayMode();
	else {
		// InputPanel relies on the outputIndex to check if we have data
		outputIndex.value = determineInitialOutputIndex();
	}
});

watch(
	inputDataPage,
	(data: INodeExecutionData[]) => {
		if (props.paneType && data) {
			ndvStore.setNDVPanelDataIsEmpty({
				panel: props.paneType,
				isEmpty: data.every((item) => isEmpty(item.json)),
			});
		}
	},
	{ immediate: true, deep: true },
);

watch(jsonData, (data: IDataObject[], prevData: IDataObject[]) => {
	if (isEqual(data, prevData)) return;
	refreshDataSize();
	if (dataCount.value) {
		resetCurrentPageIfTooFar();
	}
	showPinDataDiscoveryTooltip(data);
});

watch(binaryData, (newData, prevData) => {
	if (newData.length && !prevData.length && props.displayMode !== 'binary') {
		switchToBinary();
	} else if (!newData.length && props.displayMode === 'binary') {
		onDisplayModeChange('table');
	}
});

watch(currentOutputIndex, (branchIndex: number) => {
	ndvStore.setNDVBranchIndex({
		pane: props.paneType,
		branchIndex,
	});
});

watch(search, (newSearch) => {
	emit('search', newSearch);
});

// Switch to AI display mode if it's most suitable
watch(
	hasParsedAiContent,
	(hasAiContent) => {
		if (hasAiContent && props.displayMode !== 'ai') {
			emit('displayModeChange', 'ai');
		}
	},
	{ immediate: true },
);

onMounted(() => {
	init();

	ndvEventBus.on('setInputBranchIndex', setInputBranchIndex);

	if (!isPaneTypeInput.value) {
		showPinDataDiscoveryTooltip(jsonData.value);
	}
	ndvStore.setNDVBranchIndex({
		pane: props.paneType,
		branchIndex: currentOutputIndex.value,
	});

	if (props.paneType === 'output') {
		setDisplayMode();
		activatePane();
	}

	if (hasRunError.value && node.value) {
		const error = workflowRunData.value?.[node.value.name]?.[props.runIndex]?.error;
		const errorsToTrack = ['unknown error'];

		if (error && errorsToTrack.some((e) => error.message?.toLowerCase().includes(e))) {
			telemetry.track('User encountered an error', {
				node: node.value.type,
				errorMessage: error.message,
				nodeVersion: node.value.typeVersion,
				n8nVersion: rootStore.versionCli,
			});
		}
	}
});

onBeforeUnmount(() => {
	hidePinDataDiscoveryTooltip();
	ndvEventBus.off('setInputBranchIndex', setInputBranchIndex);
});

function getResolvedNodeOutputs() {
	if (node.value && nodeType.value) {
		const workflowNode = props.workflow.getNode(node.value.name);

		if (workflowNode) {
			const outputs = NodeHelpers.getNodeOutputs(props.workflow, workflowNode, nodeType.value);
			return outputs;
		}
	}
	return [];
}
function shouldHintBeDisplayed(hint: NodeHint): boolean {
	const { location, whenToDisplay } = hint;

	if (location) {
		if (location === 'ndv' && !['input', 'output'].includes(props.paneType)) {
			return false;
		}
		if (location === 'inputPane' && props.paneType !== 'input') {
			return false;
		}

		if (location === 'outputPane' && props.paneType !== 'output') {
			return false;
		}
	}

	if (whenToDisplay === 'afterExecution' && !hasNodeRun.value) {
		return false;
	}

	if (whenToDisplay === 'beforeExecution' && hasNodeRun.value) {
		return false;
	}

	return true;
}
function getNodeHints(): NodeHint[] {
	try {
		if (node.value && nodeType.value) {
			const workflowNode = props.workflow.getNode(node.value.name);

			if (workflowNode) {
				const nodeHints = nodeHelpers.getNodeHints(props.workflow, workflowNode, nodeType.value, {
					runExecutionData: workflowExecution.value ?? null,
					runIndex: props.runIndex,
					connectionInputData: parentNodeOutputData.value,
				});

				const hasMultipleInputItems =
					parentNodeOutputData.value.length > 1 || parentNodePinnedData.value.length > 1;

				const nodeOutputData =
					workflowRunData.value?.[node.value.name]?.[props.runIndex]?.data?.main?.[0] ?? [];

				const genericHints = getGenericHints({
					workflowNode,
					node: node.value,
					nodeType: nodeType.value,
					nodeOutputData,
					workflow: props.workflow,
					hasNodeRun: hasNodeRun.value,
					hasMultipleInputItems,
				});

				return executionHints.value.concat(nodeHints, genericHints).filter(shouldHintBeDisplayed);
			}
		}
	} catch (error) {
		console.error('Error while getting node hints', error);
	}

	return [];
}
function onItemHover(itemIndex: number | null) {
	if (itemIndex === null) {
		emit('itemHover', null);

		return;
	}
	emit('itemHover', {
		outputIndex: currentOutputIndex.value,
		itemIndex,
	});
}

function onClickDataPinningDocsLink() {
	telemetry.track('User clicked ndv link', {
		workflow_id: workflowsStore.workflowId,
		push_ref: props.pushRef,
		node_type: activeNode.value?.type,
		pane: 'output',
		type: 'data-pinning-docs',
	});
}

function showPinDataDiscoveryTooltip(value: IDataObject[]) {
	if (!isTriggerNode.value) {
		return;
	}

	const pinDataDiscoveryFlag = useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG).value;

	if (
		value &&
		value.length > 0 &&
		!isReadOnlyRoute.value &&
		!isArchivedWorkflow.value &&
		!pinDataDiscoveryFlag
	) {
		pinDataDiscoveryComplete();

		setTimeout(() => {
			isControlledPinDataTooltip.value = true;
			pinDataDiscoveryTooltipVisible.value = true;
			dataPinningEventBus.emit('data-pinning-discovery', { isTooltipVisible: true });
		}, 500); // Wait for NDV to open
	}
}

function hidePinDataDiscoveryTooltip() {
	if (pinDataDiscoveryTooltipVisible.value) {
		isControlledPinDataTooltip.value = false;
		pinDataDiscoveryTooltipVisible.value = false;
		dataPinningEventBus.emit('data-pinning-discovery', { isTooltipVisible: false });
	}
}

function pinDataDiscoveryComplete() {
	useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG).value = 'true';
	useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG).value = 'true';
}

function enterEditMode({ origin }: EnterEditModeArgs) {
	const inputData = pinnedData.data.value
		? clearJsonKey(pinnedData.data.value)
		: executionDataToJson(rawInputData.value);

	const inputDataLength = Array.isArray(inputData)
		? inputData.length
		: Object.keys(inputData ?? {}).length;

	const data = inputDataLength > 0 ? inputData : TEST_PIN_DATA;

	ndvStore.setOutputPanelEditModeEnabled(true);
	ndvStore.setOutputPanelEditModeValue(JSON.stringify(data, null, 2));

	telemetry.track('User opened ndv edit state', {
		node_type: activeNode.value?.type,
		click_type: origin === 'editIconButton' ? 'button' : 'link',
		push_ref: props.pushRef,
		run_index: props.runIndex,
		is_output_present: hasNodeRun.value || pinnedData.hasData.value,
		view: !hasNodeRun.value && !pinnedData.hasData.value ? 'undefined' : props.displayMode,
		is_data_pinned: pinnedData.hasData.value,
	});
}

function onClickCancelEdit() {
	ndvStore.setOutputPanelEditModeEnabled(false);
	ndvStore.setOutputPanelEditModeValue('');
	onExitEditMode({ type: 'cancel' });
}

function onClickSaveEdit() {
	if (!node.value) {
		return;
	}

	const { value } = editMode.value;

	toast.clearAllStickyNotifications();

	try {
		const clearedValue = clearJsonKey(value) as INodeExecutionData[];
		try {
			pinnedData.setData(clearedValue, 'save-edit');
		} catch (error) {
			// setData function already shows toasts on error, so just return here
			return;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('ndv.pinData.error.syntaxError.title'));
		return;
	}

	ndvStore.setOutputPanelEditModeEnabled(false);

	onExitEditMode({ type: 'save' });
}

function onExitEditMode({ type }: { type: 'save' | 'cancel' }) {
	telemetry.track('User closed ndv edit state', {
		node_type: activeNode.value?.type,
		push_ref: props.pushRef,
		run_index: props.runIndex,
		view: props.displayMode,
		type,
	});
}

async function onTogglePinData({ source }: { source: PinDataSource | UnpinDataSource }) {
	if (!node.value) {
		return;
	}

	if (source === 'pin-icon-click') {
		const telemetryPayload = {
			node_type: activeNode.value?.type,
			push_ref: props.pushRef,
			run_index: props.runIndex,
			view: !hasNodeRun.value && !pinnedData.hasData.value ? 'none' : props.displayMode,
		};

		void externalHooks.run('runData.onTogglePinData', telemetryPayload);
		telemetry.track('User clicked pin data icon', telemetryPayload);
	}

	nodeHelpers.updateNodeParameterIssues(node.value);

	if (pinnedData.hasData.value) {
		pinnedData.unsetData(source);
		return;
	}

	try {
		pinnedData.setData(rawInputData.value, 'pin-icon-click');
	} catch (error) {
		console.error(error);
		return;
	}

	if (maxRunIndex.value > 0) {
		toast.showToast({
			title: i18n.baseText('ndv.pinData.pin.multipleRuns.title', {
				interpolate: {
					index: `${props.runIndex}`,
				},
			}),
			message: i18n.baseText('ndv.pinData.pin.multipleRuns.description'),
			type: 'success',
			duration: 2000,
		});
	}

	hidePinDataDiscoveryTooltip();
	pinDataDiscoveryComplete();
}

function switchToBinary() {
	onDisplayModeChange('binary');
}

function onBranchChange(value: number) {
	outputIndex.value = value;

	telemetry.track('User changed ndv branch', {
		push_ref: props.pushRef,
		branch_index: value,
		node_type: activeNode.value?.type,
		node_type_input_selection: nodeType.value ? nodeType.value.name : '',
		pane: props.paneType,
	});
}

function showTooMuchData() {
	showData.value = true;
	userEnabledShowData.value = true;
	telemetry.track('User clicked ndv button', {
		node_type: activeNode.value?.type,
		workflow_id: workflowsStore.workflowId,
		push_ref: props.pushRef,
		pane: props.paneType,
		type: 'showTooMuchData',
	});
}

function toggleLinkRuns() {
	if (props.linkedRuns) {
		unlinkRun();
	} else {
		linkRun();
	}
}

function linkRun() {
	emit('linkRun');
}

function unlinkRun() {
	emit('unlinkRun');
}

function onCurrentPageChange(value: number) {
	currentPage.value = value;
	telemetry.track('User changed ndv page', {
		node_type: activeNode.value?.type,
		workflow_id: workflowsStore.workflowId,
		push_ref: props.pushRef,
		pane: props.paneType,
		page_selected: currentPage.value,
		page_size: pageSize.value,
		items_total: dataCount.value,
	});
}

function resetCurrentPageIfTooFar() {
	const maxPage = Math.ceil(dataCount.value / pageSize.value);
	if (maxPage < currentPage.value) {
		currentPage.value = maxPage;
	}
}

function onPageSizeChange(newPageSize: number) {
	pageSize.value = newPageSize;

	resetCurrentPageIfTooFar();

	telemetry.track('User changed ndv page size', {
		node_type: activeNode.value?.type,
		workflow_id: workflowsStore.workflowId,
		push_ref: props.pushRef,
		pane: props.paneType,
		page_selected: currentPage.value,
		page_size: pageSize.value,
		items_total: dataCount.value,
	});
}

function onDisplayModeChange(newDisplayMode: IRunDataDisplayMode) {
	const previous = props.displayMode;
	emit('displayModeChange', newDisplayMode);

	if (!userEnabledShowData.value) updateShowData();

	if (dataContainerRef.value) {
		const dataDisplay = dataContainerRef.value.children[0];

		if (dataDisplay) {
			dataDisplay.scrollTo(0, 0);
		}
	}

	closeBinaryDataDisplay();
	void externalHooks.run('runData.displayModeChanged', {
		newValue: newDisplayMode,
		oldValue: previous,
	});
	if (activeNode.value) {
		telemetry.track('User changed ndv item view', {
			previous_view: previous,
			new_view: newDisplayMode,
			node_type: activeNode.value.type,
			workflow_id: workflowsStore.workflowId,
			push_ref: props.pushRef,
			pane: props.paneType,
		});
	}
}

function getRunLabel(option: number) {
	if (!node.value) {
		return;
	}

	let itemsCount = 0;
	for (let i = 0; i <= maxOutputIndex.value; i++) {
		itemsCount += getPinDataOrLiveData(getRawInputData(option - 1, i)).length;
	}
	const items = i18n.baseText('ndv.output.items', {
		adjustToNumber: itemsCount,
		interpolate: { count: itemsCount },
	});

	const metadata = workflowRunData.value?.[node.value.name]?.[option - 1]?.metadata ?? null;
	const subexecutions = metadata?.subExecutionsCount
		? i18n.baseText('ndv.output.andSubExecutions', {
				adjustToNumber: metadata.subExecutionsCount,
				interpolate: {
					count: metadata.subExecutionsCount,
				},
			})
		: '';

	const itemsLabel = itemsCount > 0 ? ` (${items}${subexecutions})` : '';
	return option + i18n.baseText('ndv.output.of') + (maxRunIndex.value + 1) + itemsLabel;
}

function getRawInputData(
	runIndex: number,
	outputIndex: number,
	connectionType: NodeConnectionType = NodeConnectionTypes.Main,
): INodeExecutionData[] {
	let inputData: INodeExecutionData[] = [];

	if (node.value) {
		inputData = nodeHelpers.getNodeInputData(
			node.value,
			runIndex,
			outputIndex,
			props.paneType,
			connectionType,
			workflowExecution.value,
		);
	}

	if (inputData.length === 0 || !Array.isArray(inputData)) {
		return [];
	}

	return inputData;
}

function getPinDataOrLiveData(data: INodeExecutionData[]): INodeExecutionData[] {
	if (pinnedData.data.value && !props.isProductionExecutionPreview) {
		return Array.isArray(pinnedData.data.value)
			? pinnedData.data.value.map((value) => ({
					json: value,
				}))
			: [
					{
						json: pinnedData.data.value,
					},
				];
	}
	return data;
}

function getFilteredData(data: INodeExecutionData[]): INodeExecutionData[] {
	if (!search.value || isSchemaView.value) {
		return data;
	}

	currentPage.value = 1;
	return data.filter(({ json }) => searchInObject(json, search.value));
}

function getDataCount(
	runIndex: number,
	outputIndex: number,
	connectionType: NodeConnectionType = NodeConnectionTypes.Main,
) {
	if (!node.value) {
		return 0;
	}

	if (workflowRunData.value?.[node.value.name]?.[runIndex]?.hasOwnProperty('error')) {
		return 1;
	}

	const rawInputData = getRawInputData(runIndex, outputIndex, connectionType);
	const pinOrLiveData = getPinDataOrLiveData(rawInputData);
	return getFilteredData(pinOrLiveData).length;
}

function determineInitialOutputIndex() {
	for (let i = 0; i <= maxOutputIndex.value; i++) {
		if (getRawInputData(props.runIndex, i).length) {
			return i;
		}
	}

	return 0;
}

function init() {
	// Reset the selected output index every time another node gets selected
	outputIndex.value = determineInitialOutputIndex();
	refreshDataSize();
	closeBinaryDataDisplay();

	let outputTypes: NodeConnectionType[] = [];
	if (node.value && nodeType.value) {
		const outputs = getResolvedNodeOutputs();
		outputTypes = NodeHelpers.getConnectionTypes(outputs);
	}
	connectionType.value = outputTypes.length === 0 ? NodeConnectionTypes.Main : outputTypes[0];
	if (binaryData.value.length > 0) {
		emit('displayModeChange', 'binary');
	} else if (props.displayMode === 'binary') {
		emit('displayModeChange', 'schema');
	}

	if (isNDVV2.value) {
		pageSize.value = RUN_DATA_DEFAULT_PAGE_SIZE;
	}
}

function closeBinaryDataDisplay() {
	binaryDataDisplayVisible.value = false;
	binaryDataDisplayData.value = null;
}

function isViewable(index: number, key: string | number): boolean {
	const { mimeType } = binaryData.value[index][key];
	return ViewableMimeTypes.includes(mimeType);
}

function isDownloadable(index: number, key: string | number): boolean {
	const { mimeType, fileName } = binaryData.value[index][key];
	return !!(mimeType && fileName);
}

async function downloadBinaryData(index: number, key: string | number) {
	const { id, data, fileName, fileExtension, mimeType } = binaryData.value[index][key];

	if (id) {
		const url = workflowsStore.getBinaryUrl(id, 'download', fileName ?? '', mimeType);
		saveAs(url, [fileName, fileExtension].join('.'));
		return;
	} else {
		const bufferString = 'data:' + mimeType + ';base64,' + data;
		const blob = await fetch(bufferString).then(async (d) => await d.blob());
		saveAs(blob, fileName);
	}
}

async function downloadJsonData() {
	const fileName = (node.value?.name ?? '').replace(/[^\w\d]/g, '_');
	const blob = new Blob([JSON.stringify(rawInputData.value, null, 2)], {
		type: 'application/json',
	});

	saveAs(blob, `${fileName}.json`);
}

function displayBinaryData(index: number, key: string | number) {
	const { data, mimeType } = binaryData.value[index][key];
	binaryDataDisplayVisible.value = true;

	binaryDataDisplayData.value = {
		node: node.value?.name,
		runIndex: props.runIndex,
		outputIndex: currentOutputIndex.value,
		index,
		key,
		data,
		mimeType,
	};
}

function getOutputName(outputIndex: number) {
	if (node.value === null) {
		return outputIndex + 1;
	}

	const outputs = getResolvedNodeOutputs();
	const outputConfiguration = outputs?.[outputIndex] as INodeOutputConfiguration;

	if (outputConfiguration && isObject(outputConfiguration)) {
		return outputConfiguration?.displayName;
	}
	if (!nodeType.value?.outputNames || nodeType.value.outputNames.length <= outputIndex) {
		return outputIndex + 1;
	}

	return nodeType.value.outputNames[outputIndex];
}

function refreshDataSize() {
	// Hide by default the data from being displayed
	showData.value = false;
	const jsonItems = inputDataPage.value.map((item) => item.json);
	const byteSize = new Blob([JSON.stringify(jsonItems)]).size;
	dataSize.value = byteSize;
	updateShowData();
}

function updateShowData() {
	// Display data if it is reasonably small (< 1MB)
	showData.value =
		(isSchemaView.value && dataSize.value < MAX_DISPLAY_DATA_SIZE_SCHEMA_VIEW) ||
		dataSize.value < MAX_DISPLAY_DATA_SIZE;
}

function onRunIndexChange(run: number) {
	emit('runChange', run);
}

function enableNode() {
	if (node.value) {
		const updateInformation = {
			name: node.value.name,
			properties: {
				disabled: !node.value.disabled,
			} as IDataObject,
		} as INodeUpdatePropertiesInformation;

		workflowsStore.updateNodeProperties(updateInformation);
	}
}

function setDisplayMode() {
	if (!activeNode.value) return;

	const shouldDisplayHtml =
		activeNode.value.type === HTML_NODE_TYPE &&
		activeNode.value.parameters.operation === 'generateHtmlTemplate';

	if (shouldDisplayHtml) {
		emit('displayModeChange', 'html');
	}
}

function activatePane() {
	emit('activatePane');
}

function onSearchClear() {
	search.value = '';
	document.dispatchEvent(new KeyboardEvent('keyup', { key: '/' }));
}

defineExpose({ enterEditMode });
</script>

<template>
	<div
		:class="[
			'run-data',
			$style.container,
			{ [$style['ndv-v2']]: isNDVV2, [$style.compact]: compact },
		]"
		@mouseover="activatePane"
	>
		<N8nCallout
			v-if="
				!isPaneTypeInput &&
				pinnedData.hasData.value &&
				!editMode.enabled &&
				!isProductionExecutionPreview
			"
			theme="secondary"
			icon="pin"
			:class="$style.pinnedDataCallout"
			data-test-id="ndv-pinned-data-callout"
		>
			{{ i18n.baseText('runData.pindata.thisDataIsPinned') }}
			<span v-if="!isReadOnlyRoute && !isArchivedWorkflow && !readOnlyEnv" class="ml-4xs">
				<N8nLink
					theme="secondary"
					size="small"
					underline
					bold
					data-test-id="ndv-unpin-data"
					@click.stop="onTogglePinData({ source: 'banner-link' })"
				>
					{{ i18n.baseText('runData.pindata.unpin') }}
				</N8nLink>
			</span>
			<template #trailingContent>
				<N8nLink
					:to="DATA_PINNING_DOCS_URL"
					size="small"
					theme="secondary"
					bold
					underline
					@click="onClickDataPinningDocsLink"
				>
					{{ i18n.baseText('runData.pindata.learnMore') }}
				</N8nLink>
			</template>
		</N8nCallout>

		<BinaryDataDisplay
			v-if="binaryDataDisplayData"
			:window-visible="binaryDataDisplayVisible"
			:display-data="binaryDataDisplayData"
			@close="closeBinaryDataDisplay"
		/>

		<div :class="$style.header">
			<div :class="$style.title">
				<slot name="header"></slot>
			</div>

			<div
				v-show="!hasRunError && !isTrimmedManualExecutionDataItem"
				:class="$style.displayModes"
				data-test-id="run-data-pane-header"
				@click.stop
			>
				<Suspense>
					<LazyRunDataSearch
						v-if="showIOSearch"
						v-model="search"
						:class="$style.search"
						:pane-type="paneType"
						:display-mode="displayMode"
						:is-area-active="isPaneActive"
						@focus="activatePane"
					/>
				</Suspense>

				<N8nIconButton
					v-if="displayMode === 'table' && collapsingTableColumnName !== null"
					:class="$style.resetCollapseButton"
					text
					icon="chevrons-up-down"
					size="xmini"
					type="tertiary"
					@click="emit('collapsingTableColumnChanged', null)"
				/>

				<RunDataDisplayModeSelect
					v-if="!disableDisplayModeSelection"
					v-show="
						hasPreviewSchema ||
						(hasNodeRun &&
							(inputData.length || binaryData.length || search || hasMultipleInputNodes) &&
							!editMode.enabled)
					"
					:compact="props.compact"
					:value="displayMode"
					:has-binary-data="binaryData.length > 0"
					:pane-type="paneType"
					:node-generates-html="
						activeNode?.type === HTML_NODE_TYPE &&
						activeNode.parameters.operation === 'generateHtmlTemplate'
					"
					:has-renderable-data="hasParsedAiContent"
					@change="onDisplayModeChange"
				/>

				<N8nIconButton
					v-if="!props.disableEdit && canPinData && !isReadOnlyRoute && !readOnlyEnv"
					v-show="!editMode.enabled"
					:title="i18n.baseText('runData.editOutput')"
					:circle="false"
					:disabled="node?.disabled"
					icon="pencil"
					type="tertiary"
					data-test-id="ndv-edit-pinned-data"
					@click="enterEditMode({ origin: 'editIconButton' })"
				/>

				<RunDataPinButton
					v-if="showPinButton"
					:disabled="pinButtonDisabled"
					:tooltip-contents-visibility="{
						binaryDataTooltipContent: !!binaryData?.length,
						pinDataDiscoveryTooltipContent:
							isControlledPinDataTooltip && pinDataDiscoveryTooltipVisible,
					}"
					:data-pinning-docs-url="DATA_PINNING_DOCS_URL"
					:pinned-data="pinnedData"
					@toggle-pin-data="onTogglePinData({ source: 'pin-icon-click' })"
				/>

				<div v-if="!props.disableEdit" v-show="editMode.enabled" :class="$style.editModeActions">
					<N8nButton
						type="tertiary"
						:label="i18n.baseText('runData.editor.cancel')"
						@click="onClickCancelEdit"
					/>
					<N8nButton
						class="ml-2xs"
						type="primary"
						:label="i18n.baseText('runData.editor.save')"
						@click="onClickSaveEdit"
					/>
				</div>
			</div>

			<RunDataItemCount v-if="props.compact" v-bind="itemsCountProps" />
		</div>

		<div v-if="inputSelectLocation === 'header'" :class="$style.inputSelect">
			<slot name="input-select"></slot>
		</div>

		<div
			v-if="maxRunIndex > 0 && !displaysMultipleNodes && !props.disableRunIndexSelection"
			v-show="!editMode.enabled"
			:class="$style.runSelector"
		>
			<div :class="$style.runSelectorInner">
				<slot v-if="inputSelectLocation === 'runs'" name="input-select"></slot>

				<N8nSelect
					:model-value="runIndex"
					:class="$style.runSelectorSelect"
					size="small"
					teleported
					data-test-id="run-selector"
					@update:model-value="onRunIndexChange"
					@click.stop
				>
					<template #prepend>{{ i18n.baseText('ndv.output.run') }}</template>
					<N8nOption
						v-for="option in maxRunIndex + 1"
						:key="option"
						:label="getRunLabel(option)"
						:value="option - 1"
					></N8nOption>
				</N8nSelect>

				<N8nTooltip v-if="canLinkRuns" placement="right">
					<template #content>
						{{ i18n.baseText(linkedRuns ? 'runData.unlinking.hint' : 'runData.linking.hint') }}
					</template>
					<N8nIconButton
						:icon="linkedRuns ? 'unlink' : 'link'"
						:class="['linkRun', linkedRuns ? 'linked' : '']"
						text
						type="tertiary"
						size="small"
						data-test-id="link-run"
						@click="toggleLinkRuns"
					/>
				</N8nTooltip>

				<slot name="run-info"></slot>
			</div>
			<ViewSubExecution
				v-if="activeTaskMetadata && !(paneType === 'input' && hasInputOverwrite)"
				:task-metadata="activeTaskMetadata"
				:display-mode="displayMode"
			/>
		</div>

		<slot v-if="!displaysMultipleNodes" name="before-data" />

		<div v-if="props.calloutMessage || $slots['callout-message']" :class="$style.hintCallout">
			<N8nCallout theme="info" data-test-id="run-data-callout">
				<slot name="callout-message">
					<N8nText v-n8n-html="props.calloutMessage" size="small"></N8nText>
				</slot>
			</N8nCallout>
		</div>
		<NodeSettingsHint v-if="props.paneType === 'output'" :node="node" />
		<N8nCallout
			v-for="hint in getNodeHints()"
			:key="hint.message"
			:class="$style.hintCallout"
			:theme="hint.type || 'info'"
			data-test-id="node-hint"
		>
			<N8nText v-n8n-html="hint.message" size="small"></N8nText>
		</N8nCallout>

		<div
			v-if="maxOutputIndex > 0 && branches.length > 1 && !displaysMultipleNodes"
			:class="$style.outputs"
			data-test-id="branches"
		>
			<slot v-if="inputSelectLocation === 'outputs'" name="input-select"></slot>
			<ViewSubExecution
				v-if="activeTaskMetadata && !(paneType === 'input' && hasInputOverwrite)"
				:task-metadata="activeTaskMetadata"
				:display-mode="displayMode"
			/>

			<div :class="$style.tabs">
				<N8nTabs
					size="small"
					:model-value="currentOutputIndex"
					:options="branches"
					@update:model-value="onBranchChange"
				/>
			</div>
		</div>

		<div
			v-else-if="
				!props.compact &&
				hasNodeRun &&
				!isSearchInSchemaView &&
				((dataCount > 0 && maxRunIndex === 0) || search) &&
				!isArtificialRecoveredEventItem &&
				!displaysMultipleNodes
			"
			v-show="!editMode.enabled"
			:class="$style.itemsCount"
			data-test-id="ndv-items-count"
		>
			<slot v-if="inputSelectLocation === 'items'" name="input-select"></slot>

			<RunDataItemCount v-bind="itemsCountProps" />
			<ViewSubExecution
				v-if="activeTaskMetadata && !(paneType === 'input' && hasInputOverwrite)"
				:task-metadata="activeTaskMetadata"
				:display-mode="displayMode"
			/>
		</div>

		<div ref="dataContainerRef" :class="$style.dataContainer" data-test-id="ndv-data-container">
			<div
				v-if="isExecuting && !isWaitNodeWaiting"
				:class="[$style.center, $style.executingMessage]"
				data-test-id="ndv-executing"
			>
				<div v-if="!props.compact" :class="$style.spinner">
					<N8nSpinner type="ring" />
				</div>
				<N8nText>{{ executingMessage }}</N8nText>
			</div>

			<div v-else-if="editMode.enabled" :class="$style.editMode">
				<div :class="[$style.editModeBody, 'ignore-key-press-canvas']">
					<JsonEditor
						:model-value="editMode.value"
						:fill-parent="true"
						@update:model-value="ndvStore.setOutputPanelEditModeValue($event)"
					/>
				</div>
				<div :class="$style.editModeFooter">
					<N8nInfoTip :bold="false" :class="$style.editModeFooterInfotip">
						{{ i18n.baseText('runData.editor.copyDataInfo') }}
						<N8nLink :to="DATA_EDITING_DOCS_URL" size="small">
							{{ i18n.baseText('generic.learnMore') }}
						</N8nLink>
					</N8nInfoTip>
				</div>
			</div>

			<div
				v-else-if="
					paneType === 'output' && hasSubworkflowExecutionError && subworkflowExecutionError
				"
				:class="$style.stretchVertically"
			>
				<NodeErrorView
					:compact="compact"
					:error="subworkflowExecutionError"
					:class="$style.errorDisplay"
					show-details
				/>
			</div>

			<div v-else-if="isWaitNodeWaiting" :class="$style.center">
				<slot name="node-waiting">xxx</slot>
			</div>

			<div
				v-else-if="!hasNodeRun && !(displaysMultipleNodes && (node?.disabled || hasPreviewSchema))"
				:class="$style.center"
			>
				<slot name="node-not-run"></slot>
			</div>

			<div
				v-else-if="paneType === 'input' && !displaysMultipleNodes && node?.disabled"
				:class="$style.center"
			>
				<N8nText>
					{{ i18n.baseText('ndv.input.disabled', { interpolate: { nodeName: node.name } }) }}
					<N8nLink @click="enableNode">
						{{ i18n.baseText('ndv.input.disabled.cta') }}
					</N8nLink>
				</N8nText>
			</div>

			<div
				v-else-if="isTrimmedManualExecutionDataItem && uiStore.isProcessingExecutionResults"
				:class="$style.center"
			>
				<div :class="$style.spinner"><N8nSpinner type="ring" /></div>
				<N8nText color="text-dark" size="large">
					{{ i18n.baseText('runData.trimmedData.loading') }}
				</N8nText>
			</div>

			<div v-else-if="isTrimmedManualExecutionDataItem" :class="$style.center">
				<N8nText bold color="text-dark" size="large">
					{{ i18n.baseText('runData.trimmedData.title') }}
				</N8nText>
				<N8nText>
					{{ i18n.baseText('runData.trimmedData.message') }}
				</N8nText>
			</div>

			<div v-else-if="hasNodeRun && isArtificialRecoveredEventItem" :class="$style.center">
				<slot name="recovered-artificial-output-data"></slot>
			</div>

			<div v-else-if="hasNodeRun && hasRunError" :class="$style.stretchVertically">
				<N8nText v-if="isPaneTypeInput" :class="$style.center" size="large" tag="p" bold>
					{{
						i18n.baseText('nodeErrorView.inputPanel.previousNodeError.title', {
							interpolate: { nodeName: node?.name ?? '' },
						})
					}}
				</N8nText>
				<div v-else-if="$slots['content']">
					<NodeErrorView
						v-if="workflowRunErrorAsNodeError"
						:error="workflowRunErrorAsNodeError"
						:class="$style.inlineError"
						:compact="compact"
					/>
					<slot name="content"></slot>
				</div>
				<NodeErrorView
					v-else-if="workflowRunErrorAsNodeError"
					:error="workflowRunErrorAsNodeError"
					:class="$style.dataDisplay"
					:compact="compact"
					show-details
				/>
			</div>

			<div
				v-else-if="
					hasNodeRun &&
					(!unfilteredDataCount || (search && !dataCount)) &&
					!displaysMultipleNodes &&
					branches.length > 1
				"
				:class="$style.center"
			>
				<div v-if="search">
					<N8nText tag="h3" size="large">{{ i18n.baseText('ndv.search.noMatch.title') }}</N8nText>
					<N8nText>
						<I18nT keypath="ndv.search.noMatch.description" tag="span" scope="global">
							<template #link>
								<a href="#" @click="onSearchClear">
									{{ i18n.baseText('ndv.search.noMatch.description.link') }}
								</a>
							</template>
						</I18nT>
					</N8nText>
				</div>
				<N8nText v-else>
					{{ noDataInBranchMessage }}
				</N8nText>
			</div>

			<div
				v-else-if="hasNodeRun && !inputData.length && !displaysMultipleNodes && !search"
				:class="$style.center"
			>
				<slot name="no-output-data"></slot>
			</div>

			<div
				v-else-if="hasNodeRun && !showData"
				data-test-id="ndv-data-size-warning"
				:class="$style.center"
			>
				<N8nText :bold="true" color="text-dark" size="large">{{ tooMuchDataTitle }}</N8nText>
				<N8nText align="center" tag="div"
					><span
						v-n8n-html="
							i18n.baseText('ndv.output.tooMuchData.message', {
								interpolate: { size: dataSizeInMB },
							})
						"
					></span
				></N8nText>

				<N8nButton
					outline
					:label="i18n.baseText('ndv.output.tooMuchData.showDataAnyway')"
					@click="showTooMuchData"
				/>

				<N8nButton
					size="small"
					:label="i18n.baseText('runData.downloadBinaryData')"
					@click="downloadJsonData()"
				/>
			</div>

			<!-- V-else slot named content which only renders if $slots.content is passed and hasNodeRun -->
			<slot v-else-if="hasNodeRun && $slots['content']" name="content"></slot>

			<div
				v-else-if="
					hasNodeRun &&
					displayMode === 'table' &&
					binaryData.length > 0 &&
					inputData.length === 1 &&
					Object.keys(jsonData[0] || {}).length === 0
				"
				:class="$style.center"
			>
				<N8nText>
					{{ i18n.baseText('runData.switchToBinary.info') }}
					<a @click="switchToBinary">
						{{ i18n.baseText('runData.switchToBinary.binary') }}
					</a>
				</N8nText>
			</div>

			<div v-else-if="showIoSearchNoMatchContent" :class="$style.center">
				<N8nText tag="h3" size="large">{{ i18n.baseText('ndv.search.noMatch.title') }}</N8nText>
				<N8nText>
					<I18nT keypath="ndv.search.noMatch.description" tag="span" scope="global">
						<template #link>
							<a href="#" @click="onSearchClear">
								{{ i18n.baseText('ndv.search.noMatch.description.link') }}
							</a>
						</template>
					</I18nT>
				</N8nText>
			</div>

			<Suspense v-else-if="hasNodeRun && displayMode === 'table' && node">
				<LazyRunDataTable
					:node="node"
					:input-data="inputDataPage"
					:mapping-enabled="mappingEnabled"
					:distance-from-active="distanceFromActive"
					:run-index="runIndex"
					:page-offset="currentPageOffset"
					:total-runs="maxRunIndex"
					:has-default-hover-state="paneType === 'input' && !search"
					:search="search"
					:header-bg-color="tableHeaderBgColor"
					:compact="props.compact"
					:disable-hover-highlight="props.disableHoverHighlight"
					:collapsing-column-name="collapsingTableColumnName"
					@mounted="emit('tableMounted', $event)"
					@active-row-changed="onItemHover"
					@display-mode-change="onDisplayModeChange"
					@collapsing-column-changed="emit('collapsingTableColumnChanged', $event)"
				/>
			</Suspense>

			<Suspense v-else-if="hasNodeRun && displayMode === 'json' && node">
				<LazyRunDataJson
					:pane-type="paneType"
					:edit-mode="editMode"
					:push-ref="pushRef"
					:node="node"
					:input-data="inputDataPage"
					:mapping-enabled="mappingEnabled"
					:distance-from-active="distanceFromActive"
					:run-index="runIndex"
					:output-index="currentOutputIndex"
					:total-runs="maxRunIndex"
					:search="search"
					:compact="props.compact"
				/>
			</Suspense>

			<Suspense v-else-if="hasNodeRun && isPaneTypeOutput && displayMode === 'html'">
				<LazyRunDataHtml :input-html="inputHtml" />
			</Suspense>

			<Suspense v-else-if="hasNodeRun && displayMode === 'ai'">
				<LazyRunDataAi
					render-type="rendered"
					:compact="compact"
					:content="parsedAiContent"
					:search="search"
				/>
			</Suspense>

			<Suspense v-else-if="(hasNodeRun || hasPreviewSchema) && isSchemaView">
				<LazyRunDataSchema
					:nodes="nodes"
					:mapping-enabled="mappingEnabled"
					:node="node"
					:data="jsonData"
					:pane-type="paneType"
					:connection-type="connectionType"
					:output-index="currentOutputIndex"
					:search="search"
					:class="$style.schema"
					:compact="props.compact"
					@clear:search="onSearchClear"
				/>
			</Suspense>

			<div v-else-if="displayMode === 'binary' && binaryData.length === 0" :class="$style.center">
				<N8nText align="center" tag="div">{{ i18n.baseText('runData.noBinaryDataFound') }}</N8nText>
			</div>

			<div v-else-if="displayMode === 'binary'" :class="$style.dataDisplay">
				<div v-for="(binaryDataEntry, index) in binaryData" :key="index">
					<div v-if="binaryData.length > 1" :class="$style.binaryIndex">
						<div>
							{{ index + 1 }}
						</div>
					</div>

					<div :class="$style.binaryRow">
						<div
							v-for="(binaryData, key) in binaryDataEntry"
							:key="index + '_' + key"
							:class="$style.binaryCell"
						>
							<div :data-test-id="'ndv-binary-data_' + index">
								<div :class="$style.binaryHeader">
									{{ key }}
								</div>
								<div v-if="binaryData.fileName">
									<div>
										<N8nText size="small" :bold="true"
											>{{ i18n.baseText('runData.fileName') }}:
										</N8nText>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.fileName }}</div>
								</div>
								<div v-if="binaryData.directory">
									<div>
										<N8nText size="small" :bold="true"
											>{{ i18n.baseText('runData.directory') }}:
										</N8nText>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.directory }}</div>
								</div>
								<div v-if="binaryData.fileExtension">
									<div>
										<N8nText size="small" :bold="true"
											>{{ i18n.baseText('runData.fileExtension') }}:</N8nText
										>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.fileExtension }}</div>
								</div>
								<div v-if="binaryData.mimeType">
									<div>
										<N8nText size="small" :bold="true"
											>{{ i18n.baseText('runData.mimeType') }}:
										</N8nText>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.mimeType }}</div>
								</div>
								<div v-if="binaryData.fileSize">
									<div>
										<N8nText size="small" :bold="true"
											>{{ i18n.baseText('runData.fileSize') }}:
										</N8nText>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.fileSize }}</div>
								</div>

								<div :class="$style.binaryButtonContainer">
									<N8nButton
										v-if="isViewable(index, key)"
										size="small"
										:label="i18n.baseText('runData.showBinaryData')"
										data-test-id="ndv-view-binary-data"
										@click="displayBinaryData(index, key)"
									/>
									<N8nButton
										v-if="isDownloadable(index, key)"
										size="small"
										type="secondary"
										:label="i18n.baseText('runData.downloadBinaryData')"
										data-test-id="ndv-download-binary-data"
										@click="downloadBinaryData(index, key)"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div v-else-if="!hasNodeRun" :class="$style.center">
				<slot name="node-not-run"></slot>
			</div>
		</div>
		<RunDataPaginationBar
			v-if="
				hidePagination === false &&
				hasNodeRun &&
				!hasRunError &&
				displayMode !== 'binary' &&
				dataCount > pageSize &&
				!isSchemaView &&
				!isArtificialRecoveredEventItem
			"
			v-show="!editMode.enabled"
			:current-page="currentPage"
			:page-size="pageSize"
			:total="dataCount"
			@update:current-page="onCurrentPageChange"
			@update:page-size="onPageSizeChange"
		/>
		<N8nBlockUi :show="blockUI" :class="$style.uiBlocker" />
	</div>
</template>

<style lang="scss" module>
.infoIcon {
	color: var(--color-foreground-dark);
}

.center {
	display: flex;
	height: 100%;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--ndv-spacing) var(--ndv-spacing) var(--spacing-xl) var(--ndv-spacing);
	text-align: center;

	> * {
		max-width: 316px;
		margin-bottom: var(--spacing-2xs);
	}
}

.container {
	--ndv-spacing: var(--spacing-s);
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.pinnedDataCallout {
	border-radius: inherit;
	border-bottom-right-radius: 0;
	border-top: 0;
	border-left: 0;
	border-right: 0;
}

.header {
	display: flex;
	align-items: center;
	margin-bottom: var(--ndv-spacing);
	padding: var(--ndv-spacing) var(--ndv-spacing) 0 var(--ndv-spacing);
	position: relative;
	overflow-x: auto;
	overflow-y: hidden;
	min-height: calc(30px + var(--ndv-spacing));
	scrollbar-width: thin;
	container-type: inline-size;

	.compact & {
		margin-bottom: var(--spacing-4xs);
		padding: var(--spacing-2xs);
		margin-bottom: 0;
		flex-shrink: 0;
		flex-grow: 0;
		min-height: auto;
		gap: var(--spacing-2xs);
	}

	> *:first-child {
		flex-grow: 1;
	}
}

.dataContainer {
	position: relative;
	overflow-y: auto;
	height: 100%;
}

.dataDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding: 0 var(--ndv-spacing) var(--spacing-3xl) var(--ndv-spacing);
	right: 0;
	overflow-y: auto;
	line-height: var(--font-line-height-xloose);
	word-break: normal;
	height: 100%;

	.compact & {
		padding: 0 var(--spacing-2xs);
	}
}

.inlineError {
	line-height: var(--font-line-height-xloose);
	padding-left: var(--ndv-spacing);
	padding-right: var(--ndv-spacing);
	padding-bottom: var(--ndv-spacing);
}

.outputs {
	display: flex;
	flex-direction: column;
	gap: var(--ndv-spacing);
	padding-left: var(--ndv-spacing);
	padding-right: var(--ndv-spacing);
	padding-bottom: var(--ndv-spacing);

	.compact & {
		padding-left: var(--spacing-2xs);
		padding-right: var(--spacing-2xs);
		padding-bottom: var(--spacing-2xs);
		font-size: var(--font-size-2xs);
	}
}

.tabs {
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: 30px;
	--color-tabs-arrow-buttons: var(--color-run-data-background);
}

.itemsCount {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding-left: var(--ndv-spacing);
	padding-right: var(--ndv-spacing);
	padding-bottom: var(--ndv-spacing);
	flex-flow: wrap;
}

.ndv-v2 .itemsCount {
	padding-left: var(--spacing-xs);
}

.inputSelect {
	padding-left: var(--ndv-spacing);
	padding-right: var(--ndv-spacing);
	padding-bottom: var(--ndv-spacing);
}

.runSelector {
	display: flex;
	align-items: center;
	flex-flow: wrap;
	padding-left: var(--ndv-spacing);
	padding-right: var(--ndv-spacing);
	margin-bottom: var(--ndv-spacing);
	gap: var(--spacing-3xs);

	:global(.el-input--suffix .el-input__inner) {
		padding-right: var(--spacing-l);
	}
}

.runSelectorInner {
	display: flex;
	gap: var(--spacing-4xs);
	align-items: center;
}

.runSelectorSelect {
	max-width: 205px;
}

.search {
	margin-left: auto;
}

.binaryIndex {
	display: block;
	padding: var(--spacing-2xs);
	font-size: var(--font-size-2xs);

	> * {
		display: inline-block;
		width: 30px;
		height: 30px;
		line-height: 30px;
		border-radius: var(--border-radius-base);
		text-align: center;
		background-color: var(--color-foreground-xdark);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-xlight);
	}
}

.binaryRow {
	display: inline-flex;
	font-size: var(--font-size-2xs);
}

.binaryCell {
	display: inline-block;
	width: 300px;
	overflow: hidden;
	background-color: var(--color-foreground-xlight);
	margin-right: var(--ndv-spacing);
	margin-bottom: var(--ndv-spacing);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	padding: var(--ndv-spacing);
}

.binaryHeader {
	color: $color-primary;
	font-weight: var(--font-weight-bold);
	font-size: 1.2em;
	padding-bottom: var(--spacing-2xs);
	margin-bottom: var(--spacing-2xs);
	border-bottom: 1px solid var(--color-text-light);
}

.binaryButtonContainer {
	margin-top: 1.5em;
	display: flex;
	flex-direction: row;
	justify-content: center;

	> * {
		flex-grow: 0;
		margin-right: var(--spacing-3xs);
	}
}

.binaryValue {
	white-space: initial;
	word-wrap: break-word;
}

.displayModes {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-grow: 1;
	gap: var(--spacing-2xs);

	.compact & {
		/* let title text alone decide the height */
		height: 0;
		visibility: hidden;

		:global(.el-input__prefix) {
			transition-duration: 0ms;
		}
	}

	.compact:hover & {
		visibility: visible;
	}
}

.tooltipContain {
	max-width: 240px;
}

.spinner {
	* {
		color: var(--color-primary);
		min-height: 40px;
		min-width: 40px;
	}

	display: flex;
	justify-content: center;
	margin-bottom: var(--ndv-spacing);
}

.editMode {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: stretch;
	padding-left: var(--ndv-spacing);
	padding-right: var(--ndv-spacing);
}

.editModeBody {
	flex: 1 1 auto;
	max-height: 100%;
	width: 100%;
	overflow: auto;
}

.editModeFooter {
	flex: 0 1 auto;
	display: flex;
	width: 100%;
	justify-content: space-between;
	align-items: center;
	padding-top: var(--ndv-spacing);
	padding-bottom: var(--ndv-spacing);
}

.editModeFooterInfotip {
	display: flex;
	flex: 1;
	width: 100%;
}

.editModeActions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-left: var(--ndv-spacing);
}

.stretchVertically {
	height: 100%;
}

.uiBlocker {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.hintCallout {
	margin-bottom: var(--spacing-xs);
	margin-left: var(--ndv-spacing);
	margin-right: var(--ndv-spacing);

	.compact & {
		margin: 0 var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs);
	}
}

.schema {
	padding: 0 var(--ndv-spacing);
}

.messageSection {
	display: flex;
	align-items: center;
	width: 100%;
}

.singleIcon {
	flex-direction: row;
	align-items: center;
}

.multipleIcons {
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing-2xs, 8px);
}

.multipleIcons .iconStack {
	margin-right: 0;
	margin-bottom: 0;
}

.iconStack {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs, 4px);
	flex-shrink: 0;
	margin-right: var(--spacing-xs);
}

.icon {
	color: var(--color-callout-info-icon);
	line-height: 1;
	font-size: var(--font-size-xs);
}

.executingMessage {
	.compact & {
		color: var(--color-text-light);
	}
}

.resetCollapseButton {
	color: var(--color-foreground-xdark);
}

@container (max-width: 240px) {
	/* Hide title when the panel is too narrow */
	.compact:hover .title {
		visibility: hidden;
		width: 0;
	}
}

.ndv-v2,
.compact {
	--ndv-spacing: var(--spacing-2xs);
}
</style>

<style lang="scss" scoped>
.run-data {
	.code-node-editor {
		height: 100%;
	}
}
</style>

<style lang="scss" scoped>
:deep(.highlight) {
	background-color: #f7dc55;
	color: black;
	border-radius: var(--border-radius-base);
	padding: 0 1px;
	font-weight: var(--font-weight-regular);
	font-style: normal;
}
</style>
