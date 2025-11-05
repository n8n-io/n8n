<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import { VIEWS } from '@/app/constants';
import type { BreakingChangeWorkflowRuleResult } from '@n8n/api-types';
import { N8nDataTableServer, N8nIcon, N8nLink, N8nTag, N8nText } from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAsyncState } from '@vueuse/core';
import orderBy from 'lodash/orderBy';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import SeverityTag from './components/SeverityTag.vue';

const props = defineProps<{ migrationRuleId: string }>();

const router = useRouter();

const { state, isLoading } = useAsyncState(
	async () => {
		const response = await breakingChangesApi.getReportForRule(
			useRootStore().restApiContext,
			props.migrationRuleId,
		);

		return response;
	},
	{
		ruleId: '',
		ruleTitle: '',
		ruleDescription: '',
		ruleSeverity: 'low',
		affectedWorkflows: [],
		recommendations: [],
	},
);

type AffectedWorkflow = BreakingChangeWorkflowRuleResult['affectedWorkflows'][number];

const tableHeaders = ref<Array<TableHeader<AffectedWorkflow>>>([
	{
		title: 'Name',
		key: 'name',
		width: 200,
	},
	{
		title: 'Issue',
		key: 'active',
		value: (row: AffectedWorkflow) => (row.active ? 'Resolved' : 'Present'),
		width: 40,
	},
	{
		title: 'Node affected',
		key: 'issues',
	},
	{
		title: 'Number of executions',
		key: 'numberOfExecutions',
		width: 40,
	},
	{
		title: 'Last executed',
		key: 'lastExecutedAt',
		width: 40,
	},
	{
		title: 'Last updated',
		key: 'lastUpdatedAt',
		width: 40,
	},
]);

function handleRowClick(_event: MouseEvent, { item }: { item: AffectedWorkflow }) {
	window.open(
		router.resolve({
			name: VIEWS.WORKFLOW,
			params: { name: item.id },
		}).href,
		'_blank',
	);
}

const sortBy = ref([{ id: 'numberOfExecutions', desc: true }]);

const filteredWorkflows = computed(() => state.value.affectedWorkflows);

const sortedWorkflows = computed(() =>
	orderBy(filteredWorkflows.value, [sortBy.value[0].id], [sortBy.value[0].desc ? 'desc' : 'asc']),
);
</script>

<template>
	<div>
		<N8nText
			tag="h2"
			size="xlarge"
			color="text-dark"
			class="mb-2xs"
			style="display: flex; align-items: center; gap: 4px"
		>
			{{ state.ruleTitle }}
			<SeverityTag :severity="state.ruleSeverity" />
			<N8nTag :text="state.affectedWorkflows.length + ' affected'" :clickable="false" />
		</N8nText>
		<N8nText tag="p" color="text-base" class="mb-2xl">
			{{ state.ruleDescription }}
			<N8nLink theme="text" underline href="#">
				<u :class="$style.NoLineBreak"> Documentation <N8nIcon icon="external-link" /></u>
			</N8nLink>
		</N8nText>
		<N8nDataTableServer
			v-model:sort-by="sortBy"
			:items-per-page="sortedWorkflows.length + 1"
			:items="sortedWorkflows"
			:items-length="sortedWorkflows.length"
			:headers="tableHeaders"
			:row-props="{ class: $style.clickableRow }"
			:loading="isLoading"
			@click:row="handleRowClick"
		>
			<template #[`item.issues`]="{ item }">
				<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
					<template v-for="(issue, index) in item.issues" :key="issue.nodeId">
						<N8nLink
							theme="text"
							:to="`/workflow/${item.id}/${issue.nodeId}`"
							new-window
							@click.capture.stop
						>
							{{ issue.nodeName }}
						</N8nLink>
						<template v-if="index < item.issues.length - 1">, </template>
					</template>
				</div>
			</template>
			<template #[`item.lastExecutedAt`]="{ item }">
				<TimeAgo v-if="item.lastExecutedAt" :date="item.lastExecutedAt.toString()" />
				<span v-else>Never</span>
			</template>
			<template #[`item.lastUpdatedAt`]="{ item }">
				<TimeAgo :date="item.lastUpdatedAt.toString()" />
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style module>
.clickableRow {
	cursor: pointer;
}
</style>
