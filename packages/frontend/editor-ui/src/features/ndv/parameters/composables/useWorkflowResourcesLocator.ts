import { ref, computed } from 'vue';
import type { CallableSubworkflow } from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';
import { useWorkflowsListStore, type WorkflowListFilters } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { Router } from 'vue-router';
import { VIEWS } from '@/app/constants';

import type { IWorkflowDb, WorkflowListResource } from '@/Interface';
import type { NodeParameterValue } from 'n8n-workflow';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

export function useWorkflowResourcesLocator(router: Router) {
	const workflowsListStore = useWorkflowsListStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
	const { renameNode } = useCanvasOperations();

	const workflowsResources = ref<
		Array<{ name: string; value: string; url: string; isArchived: boolean; active: boolean }>
	>([]);
	const isLoadingResources = ref(true);
	const searchFilter = ref('');
	const currentPage = ref(0);
	const PAGE_SIZE = 40;
	const totalCount = ref(0);
	// Rows from the callable sub-workflows endpoint. Some of them can belong to
	// workflows the user cannot read, so they stay out of the workflows cache.
	const callableWorkflowsById = ref<Record<string, CallableSubworkflow>>({});

	const hasMoreWorkflowsToLoad = computed(() => totalCount.value > workflowsResources.value.length);

	function constructName(workflow: IWorkflowDb | WorkflowListResource) {
		// Add the project name if it's not a personal project
		if (workflow.homeProject && workflow.homeProject.type !== 'personal') {
			return `${workflow.homeProject.name} — ${workflow.name}`;
		}

		return workflow.name;
	}

	function constructCallableName(workflow: CallableSubworkflow) {
		return workflow.projectName ? `${workflow.projectName} — ${workflow.name}` : workflow.name;
	}

	function getWorkflowName(id: string): string {
		const workflow = workflowsListStore.getWorkflowById(id);
		if (workflow) {
			return constructName(workflow);
		}
		const callableWorkflow = callableWorkflowsById.value[id];
		if (callableWorkflow) {
			return constructCallableName(callableWorkflow);
		}
		return id;
	}

	function getWorkflowBaseName(id: string): string | null {
		const workflow = workflowsListStore.getWorkflowById(id) ?? callableWorkflowsById.value[id];
		if (workflow) {
			return workflow.name;
		}
		return null;
	}

	function getWorkflowUrl(workflowId: string) {
		const { href } = router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } });
		return href;
	}

	function workflowDbToResourceMapper(workflow: WorkflowListResource | IWorkflowDb) {
		return {
			name: constructName(workflow),
			value: workflow.id,
			url: getWorkflowUrl(workflow.id),
			isArchived: 'isArchived' in workflow ? workflow.isArchived : false,
			active: 'active' in workflow ? workflow.active : false,
		};
	}

	function callableWorkflowToResourceMapper(workflow: CallableSubworkflow) {
		return {
			name: constructCallableName(workflow),
			value: workflow.id,
			url: getWorkflowUrl(workflow.id),
			isArchived: workflow.isArchived,
			active: workflow.active,
		};
	}

	// The callable list also holds workflows whose caller policy allows this
	// parent. The backend serves it only to users who can edit a saved parent.
	function canListCallableSubworkflows() {
		return (
			!workflowsStore.isNewWorkflow &&
			getResourcePermissions(workflowDocumentStore.value.scopes).workflow.update === true
		);
	}

	async function fetchNextResources() {
		if (canListCallableSubworkflows()) {
			const { count, data } = await workflowsListStore.fetchCallableSubworkflowsPage(
				workflowsStore.workflowId,
				currentPage.value,
				PAGE_SIZE,
				searchFilter.value || undefined,
			);
			for (const workflow of data) {
				callableWorkflowsById.value[workflow.id] = workflow;
			}
			totalCount.value = count;
			return data.map(callableWorkflowToResourceMapper);
		}

		const filters: WorkflowListFilters = {
			triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'],
		};
		if (searchFilter.value) {
			filters.query = searchFilter.value;
		}

		const workflows = await workflowsListStore.fetchWorkflowsPage(
			undefined,
			currentPage.value,
			PAGE_SIZE,
			'updatedAt:desc',
			filters,
		);
		totalCount.value = workflowsListStore.totalWorkflowCount;
		return workflows.map(workflowDbToResourceMapper);
	}

	async function populateNextWorkflowsPage(reset = false) {
		if (reset) {
			currentPage.value = 0;
		}

		currentPage.value++;

		const resources = await fetchNextResources();

		if (reset) {
			workflowsResources.value = resources;
		} else {
			workflowsResources.value.push(...resources);
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

		const nodeName = ndvStore.value.activeNodeName;
		if (
			nodeName &&
			(/^Execute Workflow\d*$/.test(nodeName) ||
				/^Call n8n Workflow Tool\d*$/.test(nodeName) ||
				(nodeName.startsWith("Call '") && nodeName.endsWith("'")))
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
		getWorkflowBaseName,
		applyDefaultExecuteWorkflowNodeName,
		populateNextWorkflowsPage,
		setWorkflowsResources,
		workflowDbToResourceMapper,
	};
}
