<script lang="ts" setup="">
import type { InsightsByWorkflow } from '@n8n/api-types';
import N8nDataTableServer, {
	type TableHeader,
} from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';
import { computed, ref } from 'vue';

const props = defineProps<{
	data: InsightsByWorkflow;
	loading?: boolean;
}>();

type Item = InsightsByWorkflow['data'][number];

const rows = computed(() => props.data.data);

const headers = ref<Array<TableHeader<Item>>>([
	{
		title: 'Name',
		key: 'workflowName',
		disableSort: true,
	},
	{
		title: 'Executions',
		key: 'total',
	},
	{
		title: 'Failures',
		key: 'failed',
	},
	{
		title: 'Failure rate',
		key: 'failureRate',
	},
	{
		title: 'Time saved',
		key: 'timeSaved',
	},
	{
		title: 'Run time',
		key: 'averageRunTime',
	},
	{
		title: 'Project name',
		key: 'projectName',
		disableSort: true,
	},
]);

const sortTableBy = ref([{ id: 'total', desc: true }]);
const currentPage = ref(0);
const itemsPerPage = ref(20);

const emit = defineEmits<{
	'update:options': [
		payload: {
			page: number;
			itemsPerPage: number;
			sortBy: Array<{ id: string; desc: boolean }>;
		},
	];
}>();
</script>

<template>
	<div>
		<N8nHeading bold tag="h3" size="medium" class="mb-s">Workflow insights</N8nHeading>
		<N8nDataTableServer
			v-model:sort-by="sortTableBy"
			v-model:page="currentPage"
			v-model:items-per-page="itemsPerPage"
			:items="rows"
			:headers="headers"
			:items-length="data.count"
			:loading="loading"
			@update:options="emit('update:options', $event)"
		/>
	</div>
</template>

<style lang="scss" module></style>
