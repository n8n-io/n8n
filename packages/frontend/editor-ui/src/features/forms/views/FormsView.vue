<script lang="ts" setup>
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/app/components/WorkflowCard.vue';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { FORM_TRIGGER_NODE_TYPE, VIEWS } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import type {
	BaseFilters,
	Resource,
	SortingAndPaginationUpdates,
	WorkflowResource,
} from '@/Interface';
import { N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

const workflowsListStore = useWorkflowsListStore();
const insightsStore = useInsightsStore();
const router = useRouter();
const i18n = useI18n();

const StatusFilter = { ALL: '', ACTIVE: 'active', DEACTIVATED: 'deactivated' } as const;

interface FormsFilters extends BaseFilters {
	status: string;
}

// Intercept WorkflowCard's built-in navigation to VIEWS.WORKFLOW so clicking a
// card lands directly on the workflow's Form tab. The guard is installed while
// this view is mounted and removed on unmount.
let removeGuard: (() => void) | undefined;
onMounted(() => {
	removeGuard = router.beforeEach((to) => {
		if (to.name === VIEWS.WORKFLOW && to.params.workflowId) {
			return { name: VIEWS.WORKFLOW_FORMS, params: { workflowId: to.params.workflowId } };
		}
		return true;
	});
});
onUnmounted(() => {
	removeGuard?.();
});

const loading = ref(false);
const workflows = ref<WorkflowResource[]>([]);
const filters = ref<FormsFilters>({ search: '', homeProject: '', status: StatusFilter.ALL });
const sortBy = ref('lastUpdated');

const statusFilterOptions = computed(() => [
	{ label: i18n.baseText('workflows.filters.status.all'), value: StatusFilter.ALL },
	{ label: i18n.baseText('workflows.filters.status.active'), value: StatusFilter.ACTIVE },
	{ label: i18n.baseText('workflows.filters.status.deactivated'), value: StatusFilter.DEACTIVATED },
]);

const showInsights = computed(() => insightsStore.isSummaryEnabled && workflows.value.length > 0);

async function initialize() {
	loading.value = true;
	try {
		const results = await workflowsListStore.searchWorkflows({
			triggerNodeTypes: [FORM_TRIGGER_NODE_TYPE],
		});
		workflows.value = results.map((w) => ({
			resourceType: 'workflow',
			id: w.id,
			name: w.name,
			description: w.description ?? undefined,
			active: w.active ?? false,
			activeVersionId: w.activeVersionId,
			isArchived: w.isArchived,
			updatedAt: w.updatedAt.toString(),
			createdAt: w.createdAt.toString(),
			homeProject: w.homeProject,
			scopes: w.scopes,
			sharedWithProjects: w.sharedWithProjects,
			readOnly: !getResourcePermissions(w.scopes).workflow.update,
			tags: w.tags,
			parentFolder: w.parentFolder,
			settings: w.settings,
		})) satisfies WorkflowResource[];
	} finally {
		loading.value = false;
	}
}

const onPaginationAndSort = (payload: SortingAndPaginationUpdates) => {
	if (payload.sort) {
		sortBy.value = payload.sort;
	}
};

const filteredWorkflows = computed<Resource[]>(() => {
	const q = filters.value.search.toLowerCase();
	const projectId = filters.value.homeProject;
	const status = filters.value.status;

	const result = workflows.value.filter((w) => {
		if (q && !w.name.toLowerCase().includes(q)) return false;
		if (projectId && w.homeProject?.id !== projectId) return false;
		if (status === StatusFilter.ACTIVE && !w.active) return false;
		if (status === StatusFilter.DEACTIVATED && w.active) return false;
		return true;
	});

	return [...result].sort((a, b) => {
		switch (sortBy.value) {
			case 'lastUpdated':
				return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
			case 'lastCreated':
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			case 'nameAsc':
				return a.name.trim().localeCompare(b.name.trim());
			case 'nameDesc':
				return b.name.trim().localeCompare(a.name.trim());
			default:
				return 0;
		}
	});
});
</script>

<template>
	<ResourcesListLayout
		resource-key="forms-workflows"
		type="list-paginated"
		:resources="filteredWorkflows"
		:type-props="{ itemSize: 80 }"
		:disabled="true"
		:loading="loading"
		:initialize="initialize"
		:dont-perform-sorting-and-filtering="true"
		:total-items="filteredWorkflows.length"
		v-model:filters="filters"
		@click:add="() => {}"
		@update:pagination-and-sort="onPaginationAndSort"
	>
		<template #header>
			<ProjectHeader>
				<InsightsSummary
					v-if="showInsights"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>
		<template #item="{ item }">
			<WorkflowCard
				:data="item as WorkflowResource"
				:read-only="false"
				:show-ownership-badge="true"
			/>
		</template>
		<template #filters="{ setKeyValue }">
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.status')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<N8nSelect
					data-test-id="status-dropdown"
					:model-value="filters.status"
					@update:model-value="setKeyValue('status', $event)"
				>
					<N8nOption
						v-for="option in statusFilterOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</N8nSelect>
			</div>
		</template>
		<template #empty>
			<div :class="$style.empty">
				<p>{{ i18n.baseText('forms.list.emptyState.title') }}</p>
				<p>{{ i18n.baseText('forms.list.emptyState.description') }}</p>
			</div>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.empty {
	text-align: center;
	padding: var(--spacing--2xl);
}
</style>
