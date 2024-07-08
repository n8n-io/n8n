<template>
	<RunData
		ref="runDataRef"
		:node="node"
		:workflow="workflow"
		:run-index="runIndex"
		:linked-runs="linkedRuns"
		:can-link-runs="canLinkRuns"
		:too-much-data-title="$locale.baseText('ndv.output.tooMuchData.title')"
		:no-data-in-branch-message="$locale.baseText('ndv.output.noOutputDataInBranch')"
		:is-executing="isNodeRunning"
		:executing-message="$locale.baseText('ndv.output.executing')"
		:push-ref="pushRef"
		:block-u-i="blockUI"
		:is-production-execution-preview="isProductionExecutionPreview"
		:is-pane-active="isPaneActive"
		pane-type="output"
		:data-output-type="outputMode"
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
					<n8n-radio-buttons
						v-model="outputMode"
						:options="outputTypes"
						@update:model-value="onUpdateOutputMode"
					/>
				</template>
				<span v-else :class="$style.title">
					{{ $locale.baseText(outputPanelEditMode.enabled ? 'ndv.output.edit' : 'ndv.output') }}
				</span>
				<RunInfo
					v-if="hasNodeRun && !pinnedData.hasData.value && runsCount === 1"
					v-show="!outputPanelEditMode.enabled"
					:task-data="runTaskData"
					:has-stale-data="staleData"
					:has-pin-data="pinnedData.hasData.value"
				/>
			</div>
		</template>

		<template #node-not-run>
			<n8n-text v-if="workflowRunning && !isTriggerNode" data-test-id="ndv-output-waiting">{{
				$locale.baseText('ndv.output.waitingToRun')
			}}</n8n-text>
			<n8n-text v-if="!workflowRunning" data-test-id="ndv-output-run-node-hint">
				<template v-if="isSubNodeType">
					{{ $locale.baseText('ndv.output.runNodeHintSubNode') }}
				</template>
				<template v-else>
					{{ $locale.baseText('ndv.output.runNodeHint') }}
					<span v-if="canPinData" @click="insertTestData">
						<br />
						{{ $locale.baseText('generic.or') }}
						<n8n-text tag="a" size="medium" color="primary">
							{{ $locale.baseText('ndv.output.insertTestData') }}
						</n8n-text>
					</span>
				</template>
			</n8n-text>
		</template>

		<template #no-output-data>
			<n8n-text :bold="true" color="text-dark" size="large">{{
				$locale.baseText('ndv.output.noOutputData.title')
			}}</n8n-text>
			<n8n-text>
				{{ $locale.baseText('ndv.output.noOutputData.message') }}
				<a @click="openSettings">{{
					$locale.baseText('ndv.output.noOutputData.message.settings')
				}}</a>
				{{ $locale.baseText('ndv.output.noOutputData.message.settingsOption') }}
			</n8n-text>
		</template>

		<template v-if="outputMode === 'logs' && node" #content>
			<RunDataAi :node="node" :run-index="runIndex" />
		</template>
		<template #recovered-artificial-output-data>
			<div :class="$style.recoveredOutputData">
				<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
					$locale.baseText('executionDetails.executionFailed.recoveredNodeTitle')
				}}</n8n-text>
				<n8n-text>
					{{ $locale.baseText('executionDetails.executionFailed.recoveredNodeMessage') }}
				</n8n-text>
			</div>
		</template>

		<template v-if="!pinnedData.hasData.value && runsCount > 1" #run-info>
			<RunInfo :task-data="runTaskData" />
		</template>
	</RunData>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { IRunData, IRunExecutionData, Workflow } from 'n8n-workflow';
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

// Types

type RunDataRef = InstanceType<typeof RunData> | null;

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
	pushRef?: string;
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
	itemHover: [{ itemIndex: number; outputIndex: number }];
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

// Composables

const { isSubNodeType } = useNodeType({
	node: activeNode,
});
const pinnedData = usePinnedData(activeNode, {
	runIndex: props.runIndex,
	displayMode: ndvStore.getPanelDisplayMode('output'),
});

// Data

const outputMode = ref<OutputType>('regular');
const outputTypes = ref([
	{ label: i18n.baseText('ndv.output.outType.regular'), value: OUTPUT_TYPE.REGULAR },
	{ label: i18n.baseText('ndv.output.outType.logs'), value: OUTPUT_TYPE.LOGS },
]);
const runDataRef = ref<RunDataRef>(null);

// Computed

const node = computed(() => {
	return ndvStore.activeNode ?? undefined;
});

const isTriggerNode = computed(() => {
	return !!node.value && nodeTypesStore.isTriggerNode(node.value.type);
});

const hasAiMetadata = computed(() => {
	if (node.value) {
		const resultData = workflowsStore.getWorkflowResultDataByNodeName(node.value.name);

		if (!resultData || !Array.isArray(resultData) || resultData.length === 0) {
			return false;
		}

		return !!resultData[resultData.length - 1].metadata;
	}
	return false;
});

const isNodeRunning = computed(() => {
	return !!node.value && workflowsStore.isNodeExecuting(node.value.name);
});

const workflowRunning = computed(() => {
	return uiStore.isActionActive['workflowRunning'];
});

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

const onUpdateOutputMode = (outputMode: OutputType) => {
	if (outputMode === OUTPUT_TYPE.LOGS) {
		ndvEventBus.emit('setPositionByName', 'minLeft');
	} else {
		ndvEventBus.emit('setPositionByName', 'initial');
	}
};

const activatePane = () => {
	emit('activatePane');
};
</script>

<style lang="scss" module>
// The items count and displayModes are rendered in the RunData component
// this is a workaround to hide it in the output panel(for ai type) to not add unnecessary one-time props
:global([data-output-type='logs'] [class*='itemsCount']),
:global([data-output-type='logs'] [class*='displayModes']) {
	display: none;
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
