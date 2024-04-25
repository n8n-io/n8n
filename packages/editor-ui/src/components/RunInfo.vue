<template>
	<n8n-info-tip
		v-if="hasStaleData"
		theme="warning"
		type="tooltip"
		tooltip-placement="right"
		data-test-id="node-run-info-stale"
	>
		<span
			v-html="
				$locale.baseText(
					hasPinData
						? 'ndv.output.staleDataWarning.pinData'
						: 'ndv.output.staleDataWarning.regular',
				)
			"
		></span>
	</n8n-info-tip>
	<n8n-info-tip
		v-else-if="runMetadata"
		type="tooltip"
		:theme="theme"
		:data-test-id="`node-run-info-${theme}`"
		tooltip-placement="right"
	>
		<div>
			<n8n-text :bold="true" size="small"
				>{{
					runTaskData.error
						? $locale.baseText('runData.executionStatus.failed')
						: $locale.baseText('runData.executionStatus.success')
				}} </n8n-text
			><br />
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
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { ITaskData } from 'n8n-workflow';
import { convertToDisplayDateComponents } from '@/utils/formatters/dateFormatter';

export default defineComponent({
	props: {
		taskData: {}, // ITaskData
		hasStaleData: Boolean,
		hasPinData: Boolean,
	},

	computed: {
		theme(): string {
			return this.runTaskData?.error ? 'danger' : 'success';
		},
		runTaskData(): ITaskData {
			return this.taskData as ITaskData;
		},
		runMetadata(): { executionTime: number; startTime: string } | null {
			if (!this.runTaskData) {
				return null;
			}
			const { date, time } = convertToDisplayDateComponents(this.runTaskData.startTime);
			return {
				executionTime: this.runTaskData.executionTime,
				startTime: `${date} at ${time}`,
			};
		},
	},
});
</script>
