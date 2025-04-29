<script lang="ts" setup="">
import { useI18n } from '@/composables/useI18n';
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
import { useTelemetry } from '@/composables/useTelemetry';
import { VIEWS } from '@/constants';
import { computed, ref, watch } from 'vue';
import { type RouteLocationRaw, type LocationQueryRaw } from 'vue-router';

const props = defineProps<{
	data: InsightsByWorkflow;
	loading?: boolean;
}>();

const i18n = useI18n();
const telemetry = useTelemetry();

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
		title: i18n.baseText('insights.banner.title.total'),
		key: 'total',
		value(row) {
			return row.total.toLocaleString('en-US');
		},
	},
	{
		title: i18n.baseText('insights.banner.title.failed'),
		key: 'failed',
		value(row) {
			return row.failed.toLocaleString('en-US');
		},
	},
	{
		title: i18n.baseText('insights.banner.title.failureRate'),
		key: 'failureRate',
		value(row) {
			return (
				smartDecimal(transformInsightsFailureRate(row.failureRate)) +
				INSIGHTS_UNIT_MAPPING.failureRate(row.failureRate)
			);
		},
	},
	{
		title: i18n.baseText('insights.banner.title.timeSaved'),
		key: 'timeSaved',
		value(row) {
			return (
				smartDecimal(transformInsightsTimeSaved(row.timeSaved)) +
				INSIGHTS_UNIT_MAPPING.timeSaved(row.timeSaved)
			);
		},
	},
	{
		title: i18n.baseText('insights.banner.title.averageRunTime'),
		key: 'averageRunTime',
		value(row) {
			return (
				smartDecimal(transformInsightsAverageRunTime(row.averageRunTime)) +
				INSIGHTS_UNIT_MAPPING.averageRunTime(row.averageRunTime)
			);
		},
	},
	{
		title: i18n.baseText('insights.dashboard.table.projectName'),
		key: 'projectName',
		disableSort: true,
	},
]);

const sortBy = defineModel<Array<{ id: string; desc: boolean }>>('sortBy');
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

const getWorkflowLink = (item: Item, query?: LocationQueryRaw): RouteLocationRaw => ({
	name: VIEWS.WORKFLOW,
	params: {
		name: item.workflowId,
	},
	query,
});

const trackWorkflowClick = (item: Item) => {
	telemetry.track('User clicked on workflow from insights table', {
		workflow_id: item.workflowId,
	});
};

watch(sortBy, (newValue) => {
	telemetry.track('User sorted insights table', {
		sorted_by: (newValue ?? []).map((item) => ({
			...item,
			label: headers.value.find((header) => header.key === item.id)?.title,
		})),
	});
});
</script>

<template>
	<div>
		<N8nHeading bold tag="h3" size="medium" class="mb-s">Workflow insights</N8nHeading>
		<N8nDataTableServer
			v-model:sort-by="sortBy"
			v-model:page="currentPage"
			v-model:items-per-page="itemsPerPage"
			:items="rows"
			:headers="headers"
			:items-length="data.count"
			:loading="loading"
			@update:options="emit('update:options', $event)"
		>
			<template #[`item.workflowName`]="{ item }">
				<router-link :to="getWorkflowLink(item)" class="link" @click="trackWorkflowClick(item)">
					<N8nTooltip :content="item.workflowName" placement="top">
						<div class="ellipsis">
							{{ item.workflowName }}
						</div>
					</N8nTooltip>
				</router-link>
			</template>
			<template #[`item.timeSaved`]="{ item, value }">
				<router-link
					v-if="!item.timeSaved"
					:to="getWorkflowLink(item, { settings: 'true' })"
					class="link"
				>
					{{ i18n.baseText('insights.dashboard.table.estimate') }}
				</router-link>
				<template v-else>
					{{ value }}
				</template>
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
	width: fit-content;
	max-width: 100%;
}

.link {
	display: inline-flex;
	height: 100%;
	align-items: center;
	text-decoration: none;
	color: var(--color-text-base);
	text-decoration: underline;
	max-width: 100%;
	&:hover {
		color: var(--color-text-dark);
	}
}
</style>
