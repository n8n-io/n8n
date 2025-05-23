import { ref, computed } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { sortBy } from 'lodash-es';
import type { Router } from 'vue-router';
import { VIEWS } from '@/constants';

import type { IWorkflowDb, WorkflowListItem, WorkflowListResource } from '@/Interface';

export function useWorkflowResourcesLocator(router: Router) {
	const workflowsStore = useWorkflowsStore();
	const workflowsResources = ref<Array<{ name: string; value: string; url: string }>>([]);
	const isLoadingResources = ref(true);
	const searchFilter = ref('');
	const currentPage = ref(1);
	const PAGE_SIZE = 2;
	const workflows = ref<WorkflowListItem[]>();

	// const sortedWorkflows = computed(() =>
	// 	sortBy(workflowsStore.allWorkflows, (workflow) =>
	// 		new Date(workflow.updatedAt).valueOf(),
	// 	).reverse(),
	// );

	const hasMoreWorkflowsToLoad = computed(
		// () => workflowsStore.allWorkflows.length > workflowsResources.value.length,
		() => false,
	);

	const filteredResources = computed(() => {
		// return workflowsStore.allWorkflows
		// 	.filter((resource) => resource.name.toLowerCase().includes(searchFilter.value.toLowerCase()))
		// 	.map(workflowDbToResourceMapper);
		currentPage.value = 1;
		populateNextWorkflowsPage();
		return workflowsResources.value;
	});

	async function populateNextWorkflowsPage() {
		currentPage.value++;
		// TODO: replace casting with type guard
		workflows.value = (await workflowsStore.fetchWorkflowsPage(
			undefined,
			currentPage.value,
			PAGE_SIZE,
			'updatedAt:desc',
			searchFilter ? { name: searchFilter.value } : undefined,
		)) as WorkflowListItem[];
		console.log(workflows);
		workflowsResources.value.push(...workflows.value.map(workflowDbToResourceMapper));
	}

	async function setWorkflowsResources() {
		isLoadingResources.value = true;
		await populateNextWorkflowsPage();
		isLoadingResources.value = false;
	}

	async function reloadWorkflows() {
		isLoadingResources.value = true;
		await workflowsStore.fetchAllWorkflows();
		isLoadingResources.value = false;
	}

	function workflowDbToResourceMapper(workflow: WorkflowListItem) {
		return {
			name: getWorkflowName(workflow.id),
			value: workflow.id,
			url: getWorkflowUrl(workflow.id),
			isArchived: workflow.isArchived,
		};
	}

	function getWorkflowUrl(workflowId: string) {
		const { href } = router.resolve({ name: VIEWS.WORKFLOW, params: { name: workflowId } });
		return href;
	}

	function getWorkflowName(id: string): string {
		const workflow = workflowsStore.getWorkflowById(id);
		if (workflow) {
			// Add the project name if it's not a personal project
			if (workflow.homeProject && workflow.homeProject.type !== 'personal') {
				return `${workflow.homeProject.name} — ${workflow.name}`;
			}
			return workflow.name;
		}
		return id;
	}

	function onSearchFilter(filter: string) {
		debugger;
		searchFilter.value = filter;
	}

	return {
		workflowsResources,
		isLoadingResources,
		hasMoreWorkflowsToLoad,
		filteredResources,
		searchFilter,
		reloadWorkflows,
		getWorkflowUrl,
		onSearchFilter,
		getWorkflowName,
		populateNextWorkflowsPage,
		setWorkflowsResources,
	};
}
