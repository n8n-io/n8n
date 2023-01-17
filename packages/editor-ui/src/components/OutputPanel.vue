<template>
	<RunData
		:nodeUi="node"
		:runIndex="runIndex"
		:linkedRuns="linkedRuns"
		:canLinkRuns="canLinkRuns"
		:tooMuchDataTitle="$locale.baseText('ndv.output.tooMuchData.title')"
		:noDataInBranchMessage="$locale.baseText('ndv.output.noOutputDataInBranch')"
		:isExecuting="isNodeRunning"
		:executingMessage="$locale.baseText('ndv.output.executing')"
		:sessionId="sessionId"
		:blockUI="blockUI"
		:isProductionExecutionPreview="isProductionExecutionPreview"
		paneType="output"
		@runChange="onRunIndexChange"
		@linkRun="onLinkRun"
		@unlinkRun="onUnlinkRun"
		@tableMounted="$emit('tableMounted', $event)"
		@itemHover="$emit('itemHover', $event)"
		ref="runData"
		data-test-id="ndv-output-panel"
	>
		<template #header>
			<div :class="$style.titleSection">
				<span :class="$style.title">
					{{ $locale.baseText(outputPanelEditMode.enabled ? 'ndv.output.edit' : 'ndv.output') }}
				</span>
				<RunInfo
					v-if="!hasPinData && runsCount === 1"
					v-show="!outputPanelEditMode.enabled"
					:taskData="runTaskData"
				/>

				<n8n-info-tip
					theme="warning"
					type="tooltip"
					tooltipPlacement="right"
					v-if="hasNodeRun && staleData"
				>
					<template>
						<span
							v-html="
								$locale.baseText(
									hasPinData
										? 'ndv.output.staleDataWarning.pinData'
										: 'ndv.output.staleDataWarning.regular',
								)
							"
						></span>
					</template>
				</n8n-info-tip>
			</div>
		</template>

		<template #node-not-run>
			<n8n-text v-if="workflowRunning && !isTriggerNode" data-test-id="ndv-output-waiting">{{
				$locale.baseText('ndv.output.waitingToRun')
			}}</n8n-text>
			<n8n-text v-if="!workflowRunning" data-test-id="ndv-output-run-node-hint">
				{{ $locale.baseText('ndv.output.runNodeHint') }}
				<span @click="insertTestData" v-if="canPinData">
					<br />
					{{ $locale.baseText('generic.or') }}
					<n8n-text tag="a" size="medium" color="primary">
						{{ $locale.baseText('ndv.output.insertTestData') }}
					</n8n-text>
				</span>
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

		<template #run-info v-if="!hasPinData && runsCount > 1">
			<RunInfo :taskData="runTaskData" />
		</template>
	</RunData>
</template>

<script lang="ts">
import { IExecutionResponse, INodeUi } from '@/Interface';
import { INodeTypeDescription, IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import Vue from 'vue';
import RunData, { EnterEditModeArgs } from './RunData.vue';
import RunInfo from './RunInfo.vue';
import { pinData } from '@/mixins/pinData';
import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { useNodeTypesStore } from '@/stores/nodeTypes';

type RunDataRef = Vue & { enterEditMode: (args: EnterEditModeArgs) => void };

export default mixins(pinData).extend({
	name: 'OutputPanel',
	components: { RunData, RunInfo },
	props: {
		runIndex: {
			type: Number,
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
		sessionId: {
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
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useUIStore, useWorkflowsStore),
		node(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		isTriggerNode(): boolean {
			return this.nodeTypesStore.isTriggerNode(this.node.type);
		},
		isPollingTypeNode(): boolean {
			return !!(this.nodeType && this.nodeType.polling);
		},
		isScheduleTrigger(): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('schedule'));
		},
		isNodeRunning(): boolean {
			const executingNode = this.workflowsStore.executingNode;
			return this.node && executingNode === this.node.name;
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
			if (!executionData || !executionData.resultData || !executionData.resultData.runData) {
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

			if (runData === null || !runData.hasOwnProperty(this.node.name)) {
				return 0;
			}

			if (runData[this.node.name].length) {
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
			return this.isPinDataNodeType && !this.isReadOnly;
		},
	},
	methods: {
		insertTestData() {
			if (this.$refs.runData) {
				(this.$refs.runData as RunDataRef).enterEditMode({
					origin: 'insertTestDataLink',
				});

				this.$telemetry.track('User clicked ndv link', {
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
					node_type: this.node.type,
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
				node_type: this.node.type,
				workflow_id: this.workflowsStore.workflowId,
				session_id: this.sessionId,
				pane: 'output',
				type: 'settings',
			});
		},
		onRunIndexChange(run: number) {
			this.$emit('runChange', run);
		},
	},
});
</script>

<style lang="scss" module>
.titleSection {
	display: flex;

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
</style>
