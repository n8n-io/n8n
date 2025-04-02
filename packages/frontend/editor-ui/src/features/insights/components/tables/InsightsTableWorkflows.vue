<script lang="ts" setup="">
import { INSIGHTS_UNIT_MAPPING } from '@/features/insights/insights.constants';
import {
	transformInsightsAverageRunTime,
	transformInsightsFailureRate,
	transformInsightsTimeSaved,
} from '@/features/insights/insights.utils';
import type { InsightsByWorkflow } from '@n8n/api-types';
import { N8nTooltip } from '@n8n/design-system';
import N8nDataTableServer, {
	type TableHeader,
} from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
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
		width: 400,
		disableSort: true,
	},
	{
		title: 'Total executions',
		key: 'total',
	},
	{
		title: 'Total failed executions',
		key: 'failed',
	},
	{
		title: 'Average run time',
		key: 'failureRate',
		value(row) {
			return (
				smartDecimal(transformInsightsFailureRate(row.failureRate)) +
				INSIGHTS_UNIT_MAPPING.failureRate
			);
		},
	},
	{
		title: 'Time saved',
		key: 'timeSaved',
		value(row) {
			return (
				smartDecimal(transformInsightsTimeSaved(row.timeSaved)) + INSIGHTS_UNIT_MAPPING.timeSaved
			);
		},
	},
	{
		title: 'Run time',
		key: 'averageRunTime',
		value(row) {
			return (
				smartDecimal(transformInsightsAverageRunTime(row.averageRunTime)) +
				INSIGHTS_UNIT_MAPPING.averageRunTime
			);
		},
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
		>
			<template #[`item.workflowName`]="{ item }">
				<N8nTooltip :content="item.workflowName" placement="top">
					<div class="ellipsis">
						{{ item.workflowName }}
					</div>
				</N8nTooltip>
			</template>
			<template #[`item.projectName`]="{ item }">
				<N8nTooltip v-if="item.projectName" :content="item.projectName" placement="top">
					<div class="ellipsis">
						{{ item.projectName }}
					</div>
				</N8nTooltip>
				<template v-else> - </template>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" scoped>
.ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.2;
}
</style>
