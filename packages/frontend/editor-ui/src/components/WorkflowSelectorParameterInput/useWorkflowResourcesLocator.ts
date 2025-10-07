import { ref, computed } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { Router } from 'vue-router';
import { VIEWS } from '@/constants';

import type { IWorkflowDb, WorkflowListResource } from '@/Interface';
import type { NodeParameterValue } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';

export function useWorkflowResourcesLocator(router: Router) {
	const workflowsStore = useWorkflowsStore();
	const ndvStore = useNDVStore();
	const { renameNode } = useCanvasOperations();

	const workflowsResources = ref<
		Array<{ name: string; value: string; url: string; isArchived: boolean }>
	>([]);
	const isLoadingResources = ref(true);
	const searchFilter = ref('');
	const currentPage = ref(0);
	const PAGE_SIZE = 40;
	const totalCount = ref(0);

	const hasMoreWorkflowsToLoad = computed(() => totalCount.value > workflowsResources.value.length);

	function constructName(workflow: IWorkflowDb | WorkflowListResource) {
		// Add the project name if it's not a personal project
		if (workflow.homeProject && workflow.homeProject.type !== 'personal') {
			return `${workflow.homeProject.name} — ${workflow.name}`;
		}

		return workflow.name;
	}

	function getWorkflowName(id: string): string {
		const workflow = workflowsStore.getWorkflowById(id);
		if (workflow) {
			return constructName(workflow);
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

	function getWorkflowUrl(workflowId: string) {
		const { href } = router.resolve({ name: VIEWS.WORKFLOW, params: { name: workflowId } });
		return href;
	}

	function workflowDbToResourceMapper(workflow: WorkflowListResource | IWorkflowDb) {
		return {
			name: constructName(workflow),
			value: workflow.id,
			url: getWorkflowUrl(workflow.id),
			isArchived: 'isArchived' in workflow ? workflow.isArchived : false,
		};
	}

	async function populateNextWorkflowsPage(reset = false) {
		if (reset) {
			currentPage.value = 0;
		}

		currentPage.value++;
		const workflows = await workflowsStore.fetchWorkflowsPage(
			undefined,
			currentPage.value,
			PAGE_SIZE,
			'updatedAt:desc',
			searchFilter.value ? { name: searchFilter.value } : undefined,
		);
		totalCount.value = workflowsStore.totalWorkflowCount;

		if (reset) {
			workflowsResources.value = workflows.map(workflowDbToResourceMapper);
		} else {
			workflowsResources.value.push(...workflows.map(workflowDbToResourceMapper));
		}
	}

	async function setWorkflowsResources() {
		isLoadingResources.value = true;
		await populateNextWorkflowsPage();
		isLoadingResources.value = false;
	}

	async function onSearchFilter(filter: string) {
		searchFilter.value = filter;
		await populateNextWorkflowsPage(true);
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
		searchFilter,
		getWorkflowUrl,
		onSearchFilter,
		getWorkflowName,
		applyDefaultExecuteWorkflowNodeName,
		populateNextWorkflowsPage,
		setWorkflowsResources,
		workflowDbToResourceMapper,
	};
}
