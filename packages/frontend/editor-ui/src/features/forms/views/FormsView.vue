<script lang="ts" setup>
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/app/components/WorkflowCard.vue';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type {
	BaseFilters,
	Resource,
	SortingAndPaginationUpdates,
	WorkflowResource,
} from '@/Interface';
import { N8nHeading, N8nInputLabel, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { FORMS_WORKFLOW_VIEW } from '../constants';
import { useI18n } from '@n8n/i18n';

const workflowsListStore = useWorkflowsListStore();
const router = useRouter();
const i18n = useI18n();

const StatusFilter = { ALL: '', ACTIVE: 'active', DEACTIVATED: 'deactivated' } as const;

interface FormsFilters extends BaseFilters {
	status: string;
}

// Intercept WorkflowCard's built-in navigation and redirect to FormsWorkflowView
let removeGuard: (() => void) | undefined;
onMounted(() => {
	removeGuard = router.beforeEach((to) => {
		if (to.name === VIEWS.WORKFLOW && to.params.name) {
			return { name: FORMS_WORKFLOW_VIEW, params: { name: to.params.name } };
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

	let result = workflows.value.filter((w) => {
		if (q && !w.name.toLowerCase().includes(q)) return false;
		if (projectId && w.homeProject?.id !== projectId) return false;
		if (status === StatusFilter.ACTIVE && !w.active) return false;
		if (status === StatusFilter.DEACTIVATED && w.active) return false;
		return true;
	});

	result = [...result].sort((a, b) => {
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

	return result;
});
</script>

<template>
	<ResourcesListLayout
		resource-key="forms-workflows"
		@click:add="() => {}"
		type="list-paginated"
		:resources="filteredWorkflows"
		:type-props="{ itemSize: 80 }"
		:disabled="true"
		:loading="loading"
		:initialize="initialize"
		:dont-perform-sorting-and-filtering="true"
		:total-items="filteredWorkflows.length"
		v-model:filters="filters"
		@update:pagination-and-sort="onPaginationAndSort"
	>
		<template #header>
			<div :class="$style.header">
				<N8nHeading bold tag="h2" size="xlarge">Forms</N8nHeading>
				<N8nText color="text-light">Your workflows that start with a form</N8nText>
			</div>
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
			<div style="text-align: center; padding: var(--spacing--2xl)">
				<p>No form workflows</p>
				<p>Create a workflow with a Form Trigger node to see it here.</p>
			</div>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-bottom: var(--spacing--lg);
}
</style>
