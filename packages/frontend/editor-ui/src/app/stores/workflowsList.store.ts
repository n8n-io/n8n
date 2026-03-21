import { DEFAULT_WORKFLOW_PAGE_SIZE } from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { IWorkflowDb, IWorkflowsMap, WorkflowListResource } from '@/Interface';
import { defineStore } from 'pinia';
import { deepCopy } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/app/api/workflows';
import { makeRestApiRequest, type WorkflowHistory } from '@n8n/rest-api-client';
import { computed, ref } from 'vue';
import { isPresent } from '@/app/utils/typesUtils';

export const useWorkflowsListStore = defineStore(STORES.WORKFLOWS_LIST, () => {
	const rootStore = useRootStore();

	// State
	const totalWorkflowCount = ref(0);
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const activeWorkflows = ref<string[]>([]);

	// Computed
	const allWorkflows = computed(() =>
		Object.values(workflowsById.value).sort((a, b) => a.name.localeCompare(b.name)),
	);

	// Methods - Getters
	function getWorkflowById(id: string): IWorkflowDb {
		return workflowsById.value[id];
	}

	// Methods - Cache Management
	function setWorkflows(workflows: IWorkflowDb[]) {
		workflowsById.value = workflows.reduce<IWorkflowsMap>((acc, workflow: IWorkflowDb) => {
			if (workflow.id) {
				acc[workflow.id] = workflow;
			}
			return acc;
		}, {});
	}

	function addWorkflow(workflow: IWorkflowDb) {
		workflowsById.value = {
			...workflowsById.value,
			[workflow.id]: {
				...workflowsById.value[workflow.id],
				...deepCopy(workflow),
			},
		};
	}

	function removeWorkflow(id: string) {
		const { [id]: _, ...workflows } = workflowsById.value;
		workflowsById.value = workflows;
	}

	function updateWorkflowInCache(id: string, updates: Partial<IWorkflowDb>) {
		if (workflowsById.value[id]) {
			workflowsById.value[id] = {
				...workflowsById.value[id],
				...updates,
			};
		}
	}

	// Methods - Active Workflows Cache
	function setWorkflowActiveInCache(targetWorkflowId: string, activeVersion: WorkflowHistory) {
		if (activeWorkflows.value.indexOf(targetWorkflowId) === -1) {
			activeWorkflows.value.push(targetWorkflowId);
		}

		const cachedWorkflow = workflowsById.value[targetWorkflowId];
		if (cachedWorkflow) {
			cachedWorkflow.active = true;
			cachedWorkflow.activeVersionId = activeVersion.versionId;
			cachedWorkflow.activeVersion = activeVersion;
		}
	}

	function setWorkflowInactiveInCache(targetWorkflowId: string) {
		const index = activeWorkflows.value.indexOf(targetWorkflowId);
		if (index !== -1) {
			activeWorkflows.value.splice(index, 1);
		}
		const targetWorkflow = workflowsById.value[targetWorkflowId];
		if (targetWorkflow) {
			targetWorkflow.active = false;
			targetWorkflow.activeVersionId = null;
			targetWorkflow.activeVersion = null;
		}
	}

	// Methods - Fetching
	async function fetchWorkflowsPage(
		projectId?: string,
		page = 1,
		pageSize = DEFAULT_WORKFLOW_PAGE_SIZE,
		sortBy?: string,
		filters: {
			query?: string;
			tags?: string[];
			active?: boolean;
			isArchived?: boolean;
			parentFolderId?: string;
			availableInMCP?: boolean;
			triggerNodeTypes?: string[];
		} = {},
		includeFolders = false,
		onlySharedWithMe = false,
	): Promise<WorkflowListResource[]> {
		const filter = { ...filters, projectId };
		const options = {
			skip: (page - 1) * pageSize,
			take: pageSize,
			sortBy,
		};

		const { count, data } = await workflowsApi.getWorkflowsAndFolders(
			rootStore.restApiContext,
			Object.keys(filter).length ? filter : undefined,
			Object.keys(options).length ? options : undefined,
			includeFolders ? includeFolders : undefined,
			onlySharedWithMe ? onlySharedWithMe : undefined,
		);
		totalWorkflowCount.value = count;
		// Also set fetched workflows to store
		// When fetching workflows from overview page, they don't have resource property
		// so in order to filter out folders, we need to check if resource is not folder
		data
			.filter((item) => item.resource !== 'folder')
			.forEach((item) => {
				addWorkflow({
					...item,
					nodes: [],
					connections: {},
					versionId: '',
				});
			});
		return data;
	}

	async function searchWorkflows({
		projectId,
		query,
		nodeTypes,
		tags,
		select,
		isArchived,
		triggerNodeTypes,
	}: {
		projectId?: string;
		query?: string;
		nodeTypes?: string[];
		tags?: string[];
		select?: string[];
		isArchived?: boolean;
		triggerNodeTypes?: string[];
	}): Promise<IWorkflowDb[]> {
		const filter = {
			projectId,
			query,
			nodeTypes,
			tags,
			isArchived,
			triggerNodeTypes,
		};

		// Check if filter has meaningful values (not just undefined, null, or empty arrays/strings)
		const hasFilter = Object.values(filter).some(
			(v) => isPresent(v) && (Array.isArray(v) ? v.length > 0 : v !== ''),
		);

		const { data: workflows } = await workflowsApi.getWorkflows(
			rootStore.restApiContext,
			hasFilter ? filter : undefined,
			undefined,
			select,
		);
		return workflows;
	}

	async function fetchAllWorkflows(projectId?: string): Promise<IWorkflowDb[]> {
		const workflows = await searchWorkflows({ projectId });
		setWorkflows(workflows);
		return workflows;
	}

	async function fetchWorkflow(id: string): Promise<IWorkflowDb> {
		const workflowData = await workflowsApi.getWorkflow(rootStore.restApiContext, id);
		addWorkflow(workflowData);
		return workflowData;
	}

	async function fetchWorkflowsWithNodesIncluded(nodeTypes: string[]) {
		return await workflowsApi.getWorkflowsWithNodesIncluded(rootStore.restApiContext, nodeTypes);
	}

	async function fetchActiveWorkflows(): Promise<string[]> {
		const data = await workflowsApi.getActiveWorkflows(rootStore.restApiContext);
		activeWorkflows.value = data;
		return data;
	}

	async function checkWorkflowExists(id: string): Promise<boolean> {
		const result = await workflowsApi.workflowExists(rootStore.restApiContext, id);
		return result.exists;
	}

	// Methods - API + Cache Operations
	async function deleteWorkflow(id: string) {
		await makeRestApiRequest(rootStore.restApiContext, 'DELETE', `/workflows/${id}`);
		removeWorkflow(id);
	}

	async function archiveWorkflowInList(
		id: string,
		expectedChecksum?: string,
	): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/archive`,
			{ expectedChecksum },
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to archive workflow');
		}
		if (workflowsById.value[id]) {
			workflowsById.value[id].isArchived = true;
			workflowsById.value[id].versionId = updatedWorkflow.versionId;
		}
		setWorkflowInactiveInCache(id);
		return updatedWorkflow;
	}

	async function unarchiveWorkflowInList(id: string): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/unarchive`,
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to unarchive workflow');
		}
		if (workflowsById.value[id]) {
			workflowsById.value[id].isArchived = false;
			workflowsById.value[id].versionId = updatedWorkflow.versionId;
		}
		return updatedWorkflow;
	}

	return {
		// State
		totalWorkflowCount,
		workflowsById,
		activeWorkflows,

		// Computed
		allWorkflows,

		// Getters
		getWorkflowById,

		// Cache Management
		setWorkflows,
		addWorkflow,
		removeWorkflow,
		updateWorkflowInCache,
		setWorkflowActiveInCache,
		setWorkflowInactiveInCache,

		// Fetching
		fetchWorkflowsPage,
		searchWorkflows,
		fetchAllWorkflows,
		fetchWorkflow,
		fetchWorkflowsWithNodesIncluded,
		fetchActiveWorkflows,
		checkWorkflowExists,

		// API + Cache Operations
		deleteWorkflow,
		archiveWorkflowInList,
		unarchiveWorkflowInList,
	};
});
