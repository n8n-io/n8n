<script lang="ts" setup>
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/app/components/WorkflowCard.vue';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { BaseFilters, Resource, WorkflowResource } from '@/Interface';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { FORMS_WORKFLOW_VIEW } from '../constants';

const workflowsListStore = useWorkflowsListStore();
const router = useRouter();

// Intercept WorkflowCard's built-in navigation and redirect to FormsWorkflowView
let removeGuard: (() => void) | undefined;
onMounted(() => {
	removeGuard = router.beforeEach((to) => {
		if (to.name === VIEWS.WORKFLOW && to.params.name) {
			return { name: FORMS_WORKFLOW_VIEW, params: { workflowId: to.params.name } };
		}
		return true;
	});
});
onUnmounted(() => {
	removeGuard?.();
});

const loading = ref(false);
const workflows = ref<WorkflowResource[]>([]);
const filters = ref<BaseFilters>({ search: '', homeProject: '' });

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

const filteredWorkflows = computed<Resource[]>(() => {
	const q = filters.value.search.toLowerCase();
	if (!q) return workflows.value;
	return workflows.value.filter((w) => w.name.toLowerCase().includes(q));
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
