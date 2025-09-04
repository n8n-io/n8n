import { ref, computed } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import sortBy from 'lodash/sortBy';
import type { Router } from 'vue-router';
import { VIEWS } from '@/constants';

import type { IWorkflowDb } from '@/Interface';
import type { NodeParameterValue } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';

export function useWorkflowResourcesLocator(router: Router) {
	const workflowsStore = useWorkflowsStore();
	const ndvStore = useNDVStore();
	const { renameNode } = useCanvasOperations();

	const workflowsResources = ref<Array<{ name: string; value: string; url: string }>>([]);
	const isLoadingResources = ref(true);
	const searchFilter = ref('');
	const PAGE_SIZE = 40;

	const sortedWorkflows = computed(() =>
		sortBy(workflowsStore.allWorkflows, (workflow) =>
			new Date(workflow.updatedAt).valueOf(),
		).reverse(),
	);

	const hasMoreWorkflowsToLoad = computed(
		() => workflowsStore.allWorkflows.length > workflowsResources.value.length,
	);

	const filteredResources = computed(() => {
		return workflowsStore.allWorkflows
			.filter((resource) => resource.name.toLowerCase().includes(searchFilter.value.toLowerCase()))
			.map(workflowDbToResourceMapper);
	});

	async function populateNextWorkflowsPage() {
		await workflowsStore.fetchAllWorkflows();
		const nextPage = sortedWorkflows.value.slice(
			workflowsResources.value.length,
			workflowsResources.value.length + PAGE_SIZE,
		);

		workflowsResources.value.push(...nextPage.map(workflowDbToResourceMapper));
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

	function workflowDbToResourceMapper(workflow: IWorkflowDb) {
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

	function getWorkflowBaseName(id: string): string | null {
		const workflow = workflowsStore.getWorkflowById(id);
		if (workflow) {
			return workflow.name;
		}
		return null;
	}

	function onSearchFilter(filter: string) {
		searchFilter.value = filter;
	}

	function applyDefaultExecuteWorkflowNodeName(workflowId: NodeParameterValue) {
		if (typeof workflowId !== 'string') return;

		const nodeName = ndvStore.activeNodeName;
		if (
			nodeName === 'Execute Workflow' ||
			nodeName === 'Call n8n Workflow Tool' ||
			(nodeName?.startsWith("Call '") && nodeName?.endsWith("'"))
		) {
			const baseName = getWorkflowBaseName(workflowId);
			if (baseName !== null) {
				void renameNode(nodeName, `Call '${baseName}'`);
			}
		}
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
		applyDefaultExecuteWorkflowNodeName,
		populateNextWorkflowsPage,
		setWorkflowsResources,
	};
}
