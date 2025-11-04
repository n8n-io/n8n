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

const mockWF = [
	{
		id: 'tf2AfD7ENoPyKLkd',
		name: 'My workflow copy 2',
		active: false,
		issues: [
			{
				title:
					"File access node 'n8n-nodes-base.readWriteFile' with name 'Read/Write Files from Disk' affected",
				description: 'File access for this node is now restricted to configured directories.',
				level: 'warning',
				nodeId: '577deee0-e277-43ba-b78c-3d7f49fa7812',
				nodeName: 'Read/Write Files from Disk',
			},
		],
		numberOfExecutions: 10,
		lastUpdatedAt: '2025-10-27T08:49:37.229Z',
		lastExecutedAt: '2025-10-27T09:00:00.000Z',
	},
	{
		id: 'wIX7DQVyacoSkfXd',
		name: 'My workflow copy',
		active: false,
		issues: [
			{
				title:
					"File access node 'n8n-nodes-base.readWriteFile' with name 'Read/Write Files from Disk' affected",
				description: 'File access for this node is now restricted to configured directories.',
				level: 'warning',
				nodeId: '05d84c87-f7a3-44e1-9eab-2069316b03c0',
				nodeName: 'Read/Write Files from Disk',
			},
		],
		numberOfExecutions: 0,
		lastUpdatedAt: '2025-10-27T08:44:26.603Z',
		lastExecutedAt: null,
	},
];

function generateMockWorkflows<T extends { id: string; issues: Array<{ nodeId: string }> }>(
	workflows: T[],
	n: number,
): T[] {
	const result: T[] = [];

	for (let i = 0; i < n; i++) {
		for (const wf of workflows) {
			const cloned: T = {
				...wf,
				id: `${wf.id}-${i + 1}-${Math.random().toString(36).substring(2, 8)}`,
				issues: wf.issues.map((issue) => ({
					...issue,
					nodeId: `${issue.nodeId}-${i + 1}-${Math.random().toString(36).substring(2, 8)}`,
				})),
			};
			result.push(cloned);
		}
	}

	return result;
}

const mock: BreakingChangeWorkflowRuleResult = {
	ruleId: 'file-access-restriction-v2',
	ruleTitle: 'File Access Restrictions',
	ruleDescription: 'File access is now restricted to a default directory for security purposes',
	ruleSeverity: 'high',
	affectedWorkflows: generateMockWorkflows(mockWF, 200),
};

const { state, isLoading } = useAsyncState(
	async () => {
		const response = await breakingChangesApi.getReportForRule(
			useRootStore().restApiContext,
			props.migrationRuleId,
		);

		//mock data for development
		return mock;
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
		{{ sortBy }}
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
				<TimeAgo v-if="item.lastExecutedAt" :date="item.lastExecutedAt" />
				<span v-else>Never</span>
			</template>
			<template #[`item.lastUpdatedAt`]="{ item }">
				<TimeAgo :date="item.lastUpdatedAt" />
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style module>
.clickableRow {
	cursor: pointer;
}
</style>
