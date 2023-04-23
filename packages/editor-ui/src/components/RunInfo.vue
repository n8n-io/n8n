<template>
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
</template>

<script lang="ts">
import type { ITaskData } from 'n8n-workflow';
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		taskData: {}, // ITaskData
	},

	computed: {
		runTaskData(): ITaskData {
			return this.taskData as ITaskData;
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
	},
});
</script>
