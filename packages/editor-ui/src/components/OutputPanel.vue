<template>
	<RunData
		v-if="node"
		ref="runData"
		:node="node"
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
		@table-mounted="$emit('tableMounted', $event)"
		@item-hover="$emit('itemHover', $event)"
		@search="$emit('search', $event)"
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

<script lang="ts">
import { defineComponent } from 'vue';
import type { IExecutionResponse, INodeUi } from '@/Interface';
import type { INodeTypeDescription, IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import RunData from './RunData.vue';
import RunInfo from './RunInfo.vue';
import { mapStores, storeToRefs } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import RunDataAi from './RunDataAi/RunDataAi.vue';
import { ndvEventBus } from '@/event-bus';
import { useNodeType } from '@/composables/useNodeType';
import { usePinnedData } from '@/composables/usePinnedData';

type RunDataRef = InstanceType<typeof RunData>;

const OUTPUT_TYPE = {
	REGULAR: 'regular',
	LOGS: 'logs',
} as const;

type OutputTypeKey = keyof typeof OUTPUT_TYPE;
type OutputType = (typeof OUTPUT_TYPE)[OutputTypeKey];

export default defineComponent({
	name: 'OutputPanel',
	components: { RunData, RunInfo, RunDataAi },
	props: {
		runIndex: {
			type: Number,
			required: true,
		},
		isReadOnly: {
			type: Boolean,
		},
		linkedRuns: {
			type: Boolean,
		},
		canLinkRuns: {
			type: Boolean,
		},
		pushRef: {
			type: String,
		},
		blockUI: {
			type: Boolean,
			default: false,
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
		isPaneActive: {
			type: Boolean,
			default: false,
		},
	},
	setup(props) {
		const ndvStore = useNDVStore();
		const { activeNode } = storeToRefs(ndvStore);
		const { isSubNodeType } = useNodeType({
			node: activeNode,
		});
		const pinnedData = usePinnedData(activeNode, {
			runIndex: props.runIndex,
			displayMode: ndvStore.getPanelDisplayMode('output'),
		});

		return {
			pinnedData,
			isSubNodeType,
		};
	},
	data() {
		return {
			outputMode: 'regular',
			outputTypes: [
				{ label: this.$locale.baseText('ndv.output.outType.regular'), value: OUTPUT_TYPE.REGULAR },
				{ label: this.$locale.baseText('ndv.output.outType.logs'), value: OUTPUT_TYPE.LOGS },
			],
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useUIStore, useWorkflowsStore),
		node(): INodeUi | undefined {
			return this.ndvStore.activeNode ?? undefined;
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		isTriggerNode(): boolean {
			return !!this.node && this.nodeTypesStore.isTriggerNode(this.node.type);
		},
		hasAiMetadata(): boolean {
			if (this.node) {
				const resultData = this.workflowsStore.getWorkflowResultDataByNodeName(this.node.name);

				if (!resultData || !Array.isArray(resultData) || resultData.length === 0) {
					return false;
				}

				return !!resultData[resultData.length - 1].metadata;
			}
			return false;
		},
		isPollingTypeNode(): boolean {
			return !!this.nodeType?.polling;
		},
		isScheduleTrigger(): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('schedule'));
		},
		isNodeRunning(): boolean {
			return !!this.node && this.workflowsStore.isNodeExecuting(this.node.name);
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		workflowExecution(): IExecutionResponse | null {
			return this.workflowsStore.getWorkflowExecution;
		},
		workflowRunData(): IRunData | null {
			if (this.workflowExecution === null) {
				return null;
			}
			const executionData: IRunExecutionData | undefined = this.workflowExecution.data;
			if (!executionData?.resultData?.runData) {
				return null;
			}
			return executionData.resultData.runData;
		},
		hasNodeRun(): boolean {
			if (this.workflowsStore.subWorkflowExecutionError) return true;

			return Boolean(
				this.node && this.workflowRunData && this.workflowRunData.hasOwnProperty(this.node.name),
			);
		},
		runTaskData(): ITaskData | null {
			if (!this.node || this.workflowExecution === null) {
				return null;
			}

			const runData = this.workflowRunData;

			if (runData === null || !runData.hasOwnProperty(this.node.name)) {
				return null;
			}

			if (runData[this.node.name].length <= this.runIndex) {
				return null;
			}

			return runData[this.node.name][this.runIndex];
		},
		runsCount(): number {
			if (this.node === null) {
				return 0;
			}

			const runData: IRunData | null = this.workflowRunData;

			if (runData === null || (this.node && !runData.hasOwnProperty(this.node.name))) {
				return 0;
			}

			if (this.node && runData[this.node.name].length) {
				return runData[this.node.name].length;
			}

			return 0;
		},
		staleData(): boolean {
			if (!this.node) {
				return false;
			}
			const updatedAt = this.workflowsStore.getParametersLastUpdate(this.node.name);
			if (!updatedAt || !this.runTaskData) {
				return false;
			}
			const runAt = this.runTaskData.startTime;
			return updatedAt > runAt;
		},
		outputPanelEditMode(): { enabled: boolean; value: string } {
			return this.ndvStore.outputPanelEditMode;
		},
		canPinData(): boolean {
			return this.pinnedData.isValidNodeType.value && !this.isReadOnly;
		},
	},
	methods: {
		insertTestData() {
			const runDataRef = this.$refs.runData as RunDataRef | undefined;
			if (runDataRef) {
				runDataRef.enterEditMode({
					origin: 'insertTestDataLink',
				});

				this.$telemetry.track('User clicked ndv link', {
					workflow_id: this.workflowsStore.workflowId,
					push_ref: this.pushRef,
					node_type: this.node?.type,
					pane: 'output',
					type: 'insert-test-data',
				});
			}
		},
		onLinkRun() {
			this.$emit('linkRun');
		},
		onUnlinkRun() {
			this.$emit('unlinkRun');
		},
		openSettings() {
			this.$emit('openSettings');
			this.$telemetry.track('User clicked ndv link', {
				node_type: this.node?.type,
				workflow_id: this.workflowsStore.workflowId,
				push_ref: this.pushRef,
				pane: 'output',
				type: 'settings',
			});
		},
		onRunIndexChange(run: number) {
			this.$emit('runChange', run);
		},
		onUpdateOutputMode(outputMode: OutputType) {
			if (outputMode === OUTPUT_TYPE.LOGS) {
				ndvEventBus.emit('setPositionByName', 'minLeft');
			} else {
				ndvEventBus.emit('setPositionByName', 'initial');
			}
		},
		activatePane() {
			this.$emit('activatePane');
		},
	},
});
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
