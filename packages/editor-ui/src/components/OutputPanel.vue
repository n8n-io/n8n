<template>
	<RunData
		:nodeUi="node"
		:runIndex="runIndex"
		:linkedRuns="linkedRuns"
		:canLinkRuns="canLinkRuns"
		:emptyOutputMessage="$locale.baseText('ndv.output.emptyOutput')"
		:tooMuchDataTitle="$locale.baseText('ndv.output.tooMuchData.title')"
		:noDataInBranchMessage="$locale.baseText('ndv.output.noOutputDataInBranch')"
		@runChange="onRunIndexChange"
		@linkRun="onLinkRun"
		@unlinkRun="onUnlinkRun"
	>
		<template v-slot:header>
			<div :class="$style.titleSection">
				<span :class="$style.title">{{ $locale.baseText('ndv.output') }}</span>
				<n8n-info-tip type="tooltip" theme="info-light" tooltipPlacement="right" v-if="runMetadata">
					<div>
						<n8n-text :bold="true" size="small">{{
							$locale.baseText('runData.startTime') + ':'
						}}</n8n-text>
						{{ runMetadata.startTime }}<br />
						<n8n-text :bold="true" size="small">{{
							$locale.baseText('runData.executionTime') + ':'
						}}</n8n-text>
						{{ runMetadata.executionTime }} {{ $locale.baseText('runData.ms') }}
					</div>
				</n8n-info-tip>

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
			<div v-if="workflowRunning">
				<div :class="$style.spinner"><n8n-spinner /></div>
				<n8n-text>{{ $locale.baseText('ndv.output.executing') }}</n8n-text>
			</div>
			<n8n-text v-else-if="isPollingTypeNode">{{ $locale.baseText('ndv.output.pollEventNodeHint') }}</n8n-text>
			<n8n-text v-else-if="isTriggerNode && !isScheduleTrigger">{{ $locale.baseText('ndv.output.triggerEventNodeHint') }}</n8n-text>
			<n8n-text v-else>{{ $locale.baseText('ndv.output.runNodeHint') }}</n8n-text>
		</template>

		<template v-slot:no-output-data>
			<n8n-text :bold="true" color="text-dark">{{ $locale.baseText('ndv.output.noOutputData.title') }}</n8n-text>
			<n8n-text>
				{{ $locale.baseText('ndv.output.noOutputData.message') }}
				<a @click="openSettings">{{ $locale.baseText('ndv.output.noOutputData.message.settings') }}</a>
				{{ $locale.baseText('ndv.output.noOutputData.message.settingsOption') }}
			</n8n-text>
		</template>
	</RunData>
</template>

<script lang="ts">
import { IExecutionResponse, INodeUi } from '@/Interface';
import { INodeTypeDescription, IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import Vue from 'vue';
import RunData from './RunData.vue';

export default Vue.extend({
	name: 'OutputPanel',
	components: { RunData },
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
		runMetadata(): { executionTime: number; startTime: string } | null {
			if (!this.runTaskData) {
				return null;
			}
			return {
				executionTime: this.runTaskData.executionTime,
				startTime: new Date(this.runTaskData.startTime).toLocaleString(),
			};
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
}

.spinner {
	* {
		color: var(--color-primary);
		min-height: 40px;
		min-width: 40px;
	}

	display: flex;
	justify-content: center;
	margin-bottom: var(--spacing-s);
}

</style>
