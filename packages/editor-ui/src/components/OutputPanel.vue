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
		paneType="output"
		@runChange="onRunIndexChange"
		@linkRun="onLinkRun"
		@unlinkRun="onUnlinkRun"
	>
		<template v-slot:header>
			<div :class="$style.titleSection">
				<span :class="$style.title">{{ $locale.baseText('ndv.output') }}</span>
				<RunInfo v-if="runsCount === 1" :taskData="runTaskData" />

				<n8n-info-tip
					theme="warning"
					type="tooltip"
					tooltipPlacement="right"
					v-if="hasNodeRun && staleData"
				>
					<template>
						<span v-html="$locale.baseText('ndv.output.staleDataWarning')"></span>
					</template>
				</n8n-info-tip>
			</div>
		</template>

		<template v-slot:node-not-run>
			<n8n-text v-if="workflowRunning && !isTriggerNode">{{ $locale.baseText('ndv.output.waitingToRun') }}</n8n-text>
			<n8n-text v-if="!workflowRunning && (isScheduleTrigger || !isTriggerNode)">{{ $locale.baseText('ndv.output.runNodeHint') }}</n8n-text>
		</template>

		<template v-slot:no-output-data>
			<n8n-text :bold="true" color="text-dark" size="large">{{ $locale.baseText('ndv.output.noOutputData.title') }}</n8n-text>
			<n8n-text>
				{{ $locale.baseText('ndv.output.noOutputData.message') }}
				<a @click="openSettings">{{ $locale.baseText('ndv.output.noOutputData.message.settings') }}</a>
				{{ $locale.baseText('ndv.output.noOutputData.message.settingsOption') }}
			</n8n-text>
		</template>

		<template #run-info v-if="runsCount > 1">
			<RunInfo :taskData="runTaskData" />
		</template>
	</RunData>
</template>

<script lang="ts">
import { IExecutionResponse, INodeUi } from '@/Interface';
import { INodeTypeDescription, IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import Vue from 'vue';
import RunData from './RunData.vue';
import RunInfo from './RunInfo.vue';

export default Vue.extend({
	name: 'OutputPanel',
	components: { RunData, RunInfo },
	props: {
		runIndex: {
			type: Number,
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
	},
	computed: {
		node(): INodeUi {
			return this.$store.getters.activeNode;
		},
		nodeType (): INodeTypeDescription | null {
			if (this.node) {
				return this.$store.getters.nodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		isTriggerNode (): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('trigger'));
		},
		isPollingTypeNode (): boolean {
			return !!(this.nodeType && this.nodeType.polling);
		},
		isScheduleTrigger (): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('schedule'));
		},
		isNodeRunning(): boolean {
			const executingNode = this.$store.getters.executingNode;
			return this.node && executingNode === this.node.name;
		},
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
		workflowExecution(): IExecutionResponse | null {
			return this.$store.getters.getWorkflowExecution;
		},
		workflowRunData(): IRunData | null {
			if (this.workflowExecution === null) {
				return null;
			}
			const executionData: IRunExecutionData = this.workflowExecution.data;
			return executionData.resultData.runData;
		},
		hasNodeRun(): boolean {
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
			const updatedAt = this.$store.getters.getParametersLastUpdated(this.node.name);
			if (!updatedAt || !this.runTaskData) {
				return false;
			}
			const runAt = this.runTaskData.startTime;
			return updatedAt > runAt;
		},
	},
	methods: {
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
				workflow_id: this.$store.getters.workflowId,
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
