<script lang="ts" setup="">
import { ref } from 'vue';

const currentPage = ref();
const columns = ref([
	{
		id: 'name',
		path: 'name',
		label: 'Name',
	},
	{
		id: 'executions',
		path: 'executions',
		label: 'Executions',
	},
	{
		id: 'failures',
		path: 'failures',
		label: 'Failures',
	},
	{
		id: 'failuresRate',
		path: 'failuresRate',
		label: 'Failure rate',
	},
	{
		id: 'timeSaved',
		path: 'timeSaved',
		label: 'Time saved',
	},
	{
		id: 'runTime',
		path: 'runTime',
		label: 'Avg. run time',
	},
	{
		id: 'project',
		path: 'project',
		label: 'Project name',
	},
]);
const rows = ref(
	Array.from(Array(100).keys()).map((index) => ({
		id: crypto.randomUUID(),
		name: 'My workflow',
		executions: 1458,
		failures: 2,
		failuresRate: '0.3%',
		runTime: '8s',
		timeSaved: index % 2 ? 'Set estimate' : '62h',
		updated: '24.02.2024',
	})),
);
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
