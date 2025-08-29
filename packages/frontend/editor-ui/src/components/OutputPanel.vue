<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { NodeConnectionTypes, type IRunData, type Workflow } from 'n8n-workflow';
import RunData from './RunData.vue';
import RunInfo from './RunInfo.vue';
import { storeToRefs } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import RunDataAi from './RunDataAi/RunDataAi.vue';
import { useNodeType } from '@/composables/useNodeType';
import { usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { waitingNodeTooltip } from '@/utils/executionUtils';
import { N8nRadioButtons, N8nText } from '@n8n/design-system';
import { useSettingsStore } from '@/stores/settings.store';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { CanvasNodeDirtiness } from '@/types';
import { NDV_UI_OVERHAUL_EXPERIMENT } from '@/constants';
import { usePostHog } from '@/stores/posthog.store';
import { type IRunDataDisplayMode } from '@/Interface';
import { I18nT } from 'vue-i18n';
import { useExecutionData } from '@/composables/useExecutionData';

// Types

type RunDataRef = InstanceType<typeof RunData>;

const OUTPUT_TYPE = {
	REGULAR: 'regular',
	LOGS: 'logs',
} as const;

type OutputTypeKey = keyof typeof OUTPUT_TYPE;

type OutputType = (typeof OUTPUT_TYPE)[OutputTypeKey];

type Props = {
	workflowObject: Workflow;
	runIndex: number;
	isReadOnly?: boolean;
	linkedRuns?: boolean;
	canLinkRuns?: boolean;
	pushRef: string;
	blockUI?: boolean;
	isProductionExecutionPreview?: boolean;
	isPaneActive?: boolean;
	displayMode: IRunDataDisplayMode;
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
	execute: [];
	displayModeChange: [IRunDataDisplayMode];
}>();

// Stores

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const posthogStore = usePostHog();
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
	displayMode: props.displayMode,
});

// Data

const outputMode = ref<OutputType>(OUTPUT_TYPE.REGULAR);
const outputTypes = ref([
	{ label: i18n.baseText('ndv.output.outType.regular'), value: OUTPUT_TYPE.REGULAR },
	{ label: i18n.baseText('ndv.output.outType.logs'), value: OUTPUT_TYPE.LOGS },
]);
const runDataRef = ref<RunDataRef>();
const collapsingColumnName = ref<string | null>(null);

// Computed

const node = computed(() => {
	return ndvStore.activeNode ?? undefined;
});
const { hasNodeRun, workflowExecution, workflowRunData } = useExecutionData({ node });

const isTriggerNode = computed(() => {
	return !!node.value && nodeTypesStore.isTriggerNode(node.value.type);
});

const hasAiMetadata = computed(() => {
	if (isNodeRunning.value || !workflowRunData.value) {
		return false;
	}

	if (node.value) {
		const connectedSubNodes = props.workflowObject.getParentNodes(node.value.name, 'ALL_NON_MAIN');
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

const workflowRunning = computed(() => workflowsStore.isWorkflowRunning);

const runTaskData = computed(() => {
	if (!node.value || workflowExecution.value === null) {
		return null;
	}

	const runData = workflowRunData.value;

	if (!runData?.hasOwnProperty(node.value.name)) {
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

	const toolsAvailable = props.workflowObject.getParentNodes(
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

const isNDVV2 = computed(() =>
	posthogStore.isVariantEnabled(
		NDV_UI_OVERHAUL_EXPERIMENT.name,
		NDV_UI_OVERHAUL_EXPERIMENT.variant,
	),
);

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

function handleChangeCollapsingColumn(columnName: string | null) {
	collapsingColumnName.value = columnName;
}
</script>

<template>
	<RunData
		ref="runDataRef"
		:class="[$style.runData, { [$style.runDataV2]: isNDVV2 }]"
		:node="node"
		:workflow-object="workflowObject"
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
		:display-mode="displayMode"
		:disable-ai-content="true"
		:collapsing-table-column-name="collapsingColumnName"
		data-test-id="ndv-output-panel"
		@activate-pane="activatePane"
		@run-change="onRunIndexChange"
		@link-run="onLinkRun"
		@unlink-run="onUnlinkRun"
		@table-mounted="emit('tableMounted', $event)"
		@item-hover="emit('itemHover', $event)"
		@search="emit('search', $event)"
		@display-mode-change="emit('displayModeChange', $event)"
		@collapsing-table-column-changed="handleChangeCollapsingColumn"
	>
		<template #header>
			<div :class="[$style.titleSection, { [$style.titleSectionV2]: isNDVV2 }]">
				<template v-if="hasAiMetadata">
					<N8nRadioButtons
						v-model="outputMode"
						data-test-id="ai-output-mode-select"
						:options="outputTypes"
					/>
				</template>
				<span v-else :class="[$style.title, { [$style.titleV2]: isNDVV2 }]">
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
			<template v-if="isNDVV2">
				<NDVEmptyState
					:title="
						i18n.baseText(
							isTriggerNode
								? 'ndv.output.noOutputData.trigger.title'
								: 'ndv.output.noOutputData.v2.title',
						)
					"
				>
					<template v-if="isTriggerNode" #icon>
						<svg width="16" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M10.9062 2.40625L8.5 8.03125H12C12.4062 8.03125 12.7812 8.28125 12.9375 8.65625C13.0625 9.0625 12.9688 9.5 12.6562 9.78125L4.65625 16.7812C4.28125 17.0625 3.78125 17.0938 3.40625 16.8125C3.03125 16.5625 2.875 16.0625 3.0625 15.625L5.46875 10H2C1.5625 10 1.1875 9.75 1.0625 9.375C0.90625 8.96875 1 8.53125 1.3125 8.25L9.3125 1.25C9.6875 0.96875 10.1875 0.9375 10.5625 1.21875C10.9375 1.46875 11.0938 1.96875 10.9062 2.40625Z"
								fill="currentColor"
							/>
						</svg>
					</template>
					<template v-else #icon>
						<N8nIcon icon="arrow-right-from-line" size="xlarge" />
					</template>
					<template #description>
						<I18nT
							tag="span"
							:keypath="
								isSubNodeType
									? 'ndv.output.runNodeHintSubNode'
									: 'ndv.output.noOutputData.v2.description'
							"
							scope="global"
						>
							<template #link>
								<NodeExecuteButton
									hide-icon
									transparent
									type="secondary"
									:node-name="activeNode?.name ?? ''"
									:label="
										i18n.baseText(
											isTriggerNode
												? 'ndv.output.noOutputData.trigger.action'
												: 'ndv.output.noOutputData.v2.action',
										)
									"
									telemetry-source="inputs"
									@execute="emit('execute')"
								/>
								<br />
							</template>
						</I18nT>
					</template>
				</NDVEmptyState>
			</template>

			<template v-else>
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
		</template>

		<template #node-waiting>
			<N8nText :bold="true" color="text-dark" size="large">
				{{ i18n.baseText('ndv.output.waitNodeWaiting.title') }}
			</N8nText>
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
			<RunDataAi :node="node" :run-index="runIndex" :workflow-object="workflowObject" />
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

.runDataV2 {
	background-color: var(--color-ndvv2-run-data-background);
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

.titleSectionV2 {
	padding-left: var(--spacing-4xs);
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 2px;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
}

.titleV2 {
	letter-spacing: 2px;
	font-size: var(--font-size-xs);
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

.link {
	display: inline;
	padding: 0;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-regular);
}
</style>
