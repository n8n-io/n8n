<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
	NodeConnectionTypes,
	type IRunData,
	type IRunExecutionData,
	type Workflow,
} from 'n8n-workflow';
import RunData from './RunData.vue';
import RunInfo from './RunInfo.vue';
import { storeToRefs } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import RunDataAi from './RunDataAi/RunDataAi.vue';
import { ndvEventBus } from '@/event-bus';
import { useNodeType } from '@/composables/useNodeType';
import { usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import { waitingNodeTooltip } from '@/utils/executionUtils';
import { N8nRadioButtons, N8nText } from '@n8n/design-system';
import { useSettingsStore } from '@/stores/settings.store';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { CanvasNodeDirtiness } from '@/types';

// Types

type RunDataRef = InstanceType<typeof RunData>;

const OUTPUT_TYPE = {
	REGULAR: 'regular',
	LOGS: 'logs',
} as const;

type OutputTypeKey = keyof typeof OUTPUT_TYPE;

type OutputType = (typeof OUTPUT_TYPE)[OutputTypeKey];

type Props = {
	workflow: Workflow;
	runIndex: number;
	isReadOnly?: boolean;
	linkedRuns?: boolean;
	canLinkRuns?: boolean;
	pushRef: string;
	blockUI?: boolean;
	isProductionExecutionPreview?: boolean;
	isPaneActive?: boolean;
};

// Props and emits

const props = withDefaults(defineProps<Props>(), {
	blockUI: false,
	isProductionExecutionPreview: false,
	isPaneActive: false,
});

const emit = defineEmits<{
	linkRun: [];
	unlinkRun: [];
	runChange: [number];
	activatePane: [];
	tableMounted: [{ avgRowHeight: number }];
	itemHover: [item: { itemIndex: number; outputIndex: number } | null];
	search: [string];
	openSettings: [];
}>();

// Stores

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const { activeNode } = storeToRefs(ndvStore);
const settings = useSettingsStore();
const { dirtinessByName } = useNodeDirtiness();

// Composables

const { isSubNodeType } = useNodeType({
	node: activeNode,
});
const pinnedData = usePinnedData(activeNode, {
	runIndex: props.runIndex,
	displayMode: ndvStore.outputPanelDisplayMode,
});

// Data

const outputMode = ref<OutputType>(OUTPUT_TYPE.REGULAR);
const outputTypes = ref([
	{ label: i18n.baseText('ndv.output.outType.regular'), value: OUTPUT_TYPE.REGULAR },
	{ label: i18n.baseText('ndv.output.outType.logs'), value: OUTPUT_TYPE.LOGS },
]);
const runDataRef = ref<RunDataRef>();

// Computed

const node = computed(() => {
	return ndvStore.activeNode ?? undefined;
});

const isTriggerNode = computed(() => {
	return !!node.value && nodeTypesStore.isTriggerNode(node.value.type);
});

const hasAiMetadata = computed(() => {
	if (isNodeRunning.value || !workflowRunData.value) {
		return false;
	}

	if (node.value) {
		const connectedSubNodes = props.workflow.getParentNodes(node.value.name, 'ALL_NON_MAIN');
		const resultData = connectedSubNodes.map(workflowsStore.getWorkflowResultDataByNodeName);

		return resultData && Array.isArray(resultData) && resultData.length > 0;
	}
	return false;
});

const hasError = computed(() =>
	Boolean(
		workflowRunData.value &&
			node.value &&
			workflowRunData.value[node.value.name]?.[props.runIndex]?.error,
	),
);

// Determine the initial output mode to logs if the node has an error and the logs are available
const defaultOutputMode = computed<OutputType>(() => {
	return hasError.value && hasAiMetadata.value ? OUTPUT_TYPE.LOGS : OUTPUT_TYPE.REGULAR;
});

const isNodeRunning = computed(() => {
	return workflowRunning.value && !!node.value && workflowsStore.isNodeExecuting(node.value.name);
});

const workflowRunning = computed(() => uiStore.isActionActive.workflowRunning);

const workflowExecution = computed(() => {
	return workflowsStore.getWorkflowExecution;
});

const workflowRunData = computed(() => {
	if (workflowExecution.value === null) {
		return null;
	}
	const executionData: IRunExecutionData | undefined = workflowExecution.value.data;
	if (!executionData?.resultData?.runData) {
		return null;
	}
	return executionData.resultData.runData;
});

const hasNodeRun = computed(() => {
	if (workflowsStore.subWorkflowExecutionError) return true;

	return Boolean(
		node.value && workflowRunData.value && workflowRunData.value.hasOwnProperty(node.value.name),
	);
});

const runTaskData = computed(() => {
	if (!node.value || workflowExecution.value === null) {
		return null;
	}

	const runData = workflowRunData.value;

	if (runData === null || !runData.hasOwnProperty(node.value.name)) {
		return null;
	}

	if (runData[node.value.name].length <= props.runIndex) {
		return null;
	}

	return runData[node.value.name][props.runIndex];
});

const runsCount = computed(() => {
	if (node.value === null) {
		return 0;
	}

	const runData: IRunData | null = workflowRunData.value;

	if (runData === null || (node.value && !runData.hasOwnProperty(node.value.name))) {
		return 0;
	}

	if (node.value && runData[node.value.name].length) {
		return runData[node.value.name].length;
	}

	return 0;
});

const staleData = computed(() => {
	if (!node.value) {
		return false;
	}

	if (settings.partialExecutionVersion === 2) {
		return dirtinessByName.value[node.value.name] === CanvasNodeDirtiness.PARAMETERS_UPDATED;
	}

	const updatedAt = workflowsStore.getParametersLastUpdate(node.value.name);
	if (!updatedAt || !runTaskData.value) {
		return false;
	}
	const runAt = runTaskData.value.startTime;
	return updatedAt > runAt;
});

const outputPanelEditMode = computed(() => {
	return ndvStore.outputPanelEditMode;
});

const canPinData = computed(() => {
	return pinnedData.isValidNodeType.value && !props.isReadOnly;
});

const allToolsWereUnusedNotice = computed(() => {
	if (!node.value || runsCount.value === 0 || hasError.value) return undefined;

	// With pinned data there's no clear correct answer for whether
	// we should use historic or current parents, so we don't show the notice,
	// as it likely ends up unactionable noise to the user
	if (pinnedData.hasData.value) return undefined;

	const toolsAvailable = props.workflow.getParentNodes(
		node.value.name,
		NodeConnectionTypes.AiTool,
		1,
	);
	const toolsUsedInLatestRun = toolsAvailable.filter(
		(tool) => !!workflowRunData.value?.[tool]?.[props.runIndex],
	);
	if (toolsAvailable.length > 0 && toolsUsedInLatestRun.length === 0) {
		return i18n.baseText('ndv.output.noToolUsedInfo');
	} else {
		return undefined;
	}
});

// Methods

const insertTestData = () => {
	if (!runDataRef.value) return;

	// We should be able to fix this when we migrate RunData.vue to composition API
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	runDataRef.value.enterEditMode({
		origin: 'insertTestDataLink',
	});

	telemetry.track('User clicked ndv link', {
		workflow_id: workflowsStore.workflowId,
		push_ref: props.pushRef,
		node_type: node.value?.type,
		pane: 'output',
		type: 'insert-test-data',
	});
};

const onLinkRun = () => {
	emit('linkRun');
};

const onUnlinkRun = () => {
	emit('unlinkRun');
};

const openSettings = () => {
	emit('openSettings');
	telemetry.track('User clicked ndv link', {
		node_type: node.value?.type,
		workflow_id: workflowsStore.workflowId,
		push_ref: props.pushRef,
		pane: 'output',
		type: 'settings',
	});
};

const onRunIndexChange = (run: number) => {
	emit('runChange', run);
};

const onUpdateOutputMode = (newOutputMode: OutputType) => {
	if (newOutputMode === OUTPUT_TYPE.LOGS) {
		ndvEventBus.emit('setPositionByName', 'minLeft');
	} else {
		ndvEventBus.emit('setPositionByName', 'initial');
	}
};

// Set the initial output mode when the component is mounted
onMounted(() => {
	outputMode.value = defaultOutputMode.value;
});

// In case the output panel was opened when the node has not run yet,
// defaultOutputMode will be "regular" at the time of mounting.
// This is why we need to watch the defaultOutputMode and change the outputMode to "logs" if the node has run and criteria are met.
watch(defaultOutputMode, (newValue: OutputType, oldValue: OutputType) => {
	if (newValue === OUTPUT_TYPE.LOGS && oldValue === OUTPUT_TYPE.REGULAR && hasNodeRun.value) {
		outputMode.value = defaultOutputMode.value;
	}
});

const activatePane = () => {
	emit('activatePane');
};
</script>

<template>
	<RunData
		ref="runDataRef"
		:class="$style.runData"
		:node="node"
		:workflow="workflow"
		:run-index="runIndex"
		:linked-runs="linkedRuns"
		:can-link-runs="canLinkRuns"
		:too-much-data-title="i18n.baseText('ndv.output.tooMuchData.title')"
		:no-data-in-branch-message="i18n.baseText('ndv.output.noOutputDataInBranch')"
		:is-executing="isNodeRunning"
		:executing-message="i18n.baseText('ndv.output.executing')"
		:push-ref="pushRef"
		:block-u-i="blockUI"
		:is-production-execution-preview="isProductionExecutionPreview"
		:is-pane-active="isPaneActive"
		:hide-pagination="outputMode === 'logs'"
		pane-type="output"
		:data-output-type="outputMode"
		:callout-message="allToolsWereUnusedNotice"
		@activate-pane="activatePane"
		@run-change="onRunIndexChange"
		@link-run="onLinkRun"
		@unlink-run="onUnlinkRun"
		@table-mounted="emit('tableMounted', $event)"
		@item-hover="emit('itemHover', $event)"
		@search="emit('search', $event)"
	>
		<template #header>
			<div :class="$style.titleSection">
				<template v-if="hasAiMetadata">
					<N8nRadioButtons
						v-model="outputMode"
						data-test-id="ai-output-mode-select"
						:options="outputTypes"
						@update:model-value="onUpdateOutputMode"
					/>
				</template>
				<span v-else :class="$style.title">
					{{ i18n.baseText(outputPanelEditMode.enabled ? 'ndv.output.edit' : 'ndv.output') }}
				</span>
				<RunInfo
					v-if="
						hasNodeRun &&
						!pinnedData.hasData.value &&
						(runsCount === 1 || (runsCount > 0 && staleData))
					"
					v-show="!outputPanelEditMode.enabled"
					:task-data="runTaskData"
					:has-stale-data="staleData"
					:has-pin-data="pinnedData.hasData.value"
				/>
			</div>
		</template>

		<template #node-not-run>
			<N8nText v-if="workflowRunning && !isTriggerNode" data-test-id="ndv-output-waiting">{{
				i18n.baseText('ndv.output.waitingToRun')
			}}</N8nText>
			<N8nText v-if="!workflowRunning" data-test-id="ndv-output-run-node-hint">
				<template v-if="isSubNodeType">
					{{ i18n.baseText('ndv.output.runNodeHintSubNode') }}
				</template>
				<template v-else>
					{{ i18n.baseText('ndv.output.runNodeHint') }}
					<span v-if="canPinData" @click="insertTestData">
						<br />
						{{ i18n.baseText('generic.or') }}
						<N8nText tag="a" size="medium" color="primary">
							{{ i18n.baseText('ndv.output.insertTestData') }}
						</N8nText>
					</span>
				</template>
			</N8nText>
		</template>

		<template #node-waiting>
			<N8nText :bold="true" color="text-dark" size="large">Waiting for input</N8nText>
			<N8nText v-n8n-html="waitingNodeTooltip(node)"></N8nText>
		</template>

		<template #no-output-data>
			<N8nText :bold="true" color="text-dark" size="large">{{
				i18n.baseText('ndv.output.noOutputData.title')
			}}</N8nText>
			<N8nText>
				{{ i18n.baseText('ndv.output.noOutputData.message') }}
				<a @click="openSettings">{{ i18n.baseText('ndv.output.noOutputData.message.settings') }}</a>
				{{ i18n.baseText('ndv.output.noOutputData.message.settingsOption') }}
			</N8nText>
		</template>

		<template v-if="outputMode === 'logs' && node" #content>
			<RunDataAi :node="node" :run-index="runIndex" :workflow="workflow" />
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

		<template v-if="!pinnedData.hasData.value && runsCount > 1" #run-info>
			<RunInfo :task-data="runTaskData" />
		</template>
	</RunData>
</template>

<style lang="scss" module>
// The items count and displayModes are rendered in the RunData component
// this is a workaround to hide it in the output panel(for ai type) to not add unnecessary one-time props
:global([data-output-type='logs'] [class*='itemsCount']),
:global([data-output-type='logs'] [class*='displayModes']) {
	display: none;
}
.runData {
	background-color: var(--color-run-data-background);
}
.outputTypeSelect {
	margin-bottom: var(--spacing-4xs);
	width: fit-content;
}
.titleSection {
	display: flex;
	align-items: center;

	> * {
		margin-right: var(--spacing-2xs);
	}
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 3px;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
}

.noOutputData {
	max-width: 180px;

	> *:first-child {
		margin-bottom: var(--spacing-m);
	}

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
</style>
