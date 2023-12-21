<template>
	<n8n-info-tip
		type="tooltip"
		:theme="theme"
		:tooltipPlacement="hasStaleData ? 'left' : 'right'"
		v-if="runMetadata"
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
