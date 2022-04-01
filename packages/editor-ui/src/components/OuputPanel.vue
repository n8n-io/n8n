<template>
	<RunData :nodeUi="node" :runIndex="runIndex" @openSettings="openSettings" @runChange="onRunIndexChange">
		<template name="header">
			<div :class="$style.titleSection">
				<span :class="$style.title">{{ $locale.baseText('node.output') }}</span>
				<n8n-info-tip type="tooltip" theme="info-light" tooltipPlacement="right" v-if="runMetadata">
					<div>
						<n8n-text :bold="true" size="small">{{ $locale.baseText('runData.startTime') + ':' }}</n8n-text> {{runMetadata.startTime}}<br/>
						<n8n-text :bold="true" size="small">{{ $locale.baseText('runData.executionTime') + ':' }}</n8n-text> {{runMetadata.executionTime}} {{ $locale.baseText('runData.ms') }}
					</div>
				</n8n-info-tip>

				<n8n-info-tip theme="warning" type="tooltip" tooltipPlacement="right" v-if="hasNodeRun && staleData">
					<template>
						<span v-html="$locale.baseText('node.output.staleDataWarning')"></span>
					</template>
				</n8n-info-tip>
			</div>
		</template>
	</RunData>
</template>

<script lang="ts">
import { IExecutionResponse, INodeUi } from '@/Interface';
import { IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import Vue from 'vue';
import RunData from './RunData.vue';

export default Vue.extend({
	name: 'OutputPanel',
	components: { RunData },
	props: {
		runIndex: {
			type: Number,
		},
	},
	computed: {
		workflowExecution (): IExecutionResponse | null {
			return this.$store.getters.getWorkflowExecution;
		},
		workflowRunData (): IRunData | null {
			if (this.workflowExecution === null) {
				return null;
			}
			const executionData: IRunExecutionData = this.workflowExecution.data;
			return executionData.resultData.runData;
		},
		hasNodeRun(): boolean {
			return Boolean(this.node && this.workflowRunData && this.workflowRunData.hasOwnProperty(this.node.name));
		},
		node (): INodeUi | null {
			return this.$store.getters.activeNode;
		},
		runTaskData (): ITaskData | null {
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
		runMetadata (): {executionTime: number, startTime: string} | null {
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
</style>
