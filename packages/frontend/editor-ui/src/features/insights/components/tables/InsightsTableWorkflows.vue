<script lang="ts" setup="">
import { computed, ref } from 'vue';
import type { InsightsByWorkflow } from '@n8n/api-types';

const props = defineProps<{
	data: InsightsByWorkflow;
}>();

const currentPage = ref();
const columns = ref([
	{
		id: 'workflowName',
		path: 'workflowName',
		label: 'Name',
	},
	{
		id: 'total',
		path: 'total',
		label: 'Executions',
	},
	{
		id: 'failed',
		path: 'failed',
		label: 'Failures',
	},
	{
		id: 'failureRate',
		path: 'failureRate',
		label: 'Failure rate',
	},
	{
		id: 'timeSaved',
		path: 'timeSaved',
		label: 'Time saved',
	},
	{
		id: 'averageRunTime',
		path: 'averageRunTime',
		label: 'Run time',
	},
	{
		id: 'projectName',
		path: 'projectName',
		label: 'Project name',
	},
]);
const rows = computed(() => props.data.data);
</script>

<template>
	<div>
		<N8nHeading bold tag="h3" size="medium" class="mb-s">Workflow insights</N8nHeading>
		<N8nDatatable
			:columns
			:rows
			:current-page="currentPage"
			@update:current-page="($event: number) => (currentPage = $event)"
		/>
	</div>
</template>

<style lang="scss" module></style>
