import {
	AI_NODES_PACKAGE_NAME,
	DUPLICATE_POSTFFIX,
	MAX_WORKFLOW_NAME_LENGTH,
} from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { INodeUi, IStartRunData, IWorkflowDb } from '@/Interface';
import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionFlattedResponse,
} from '@/features/execution/executions/executions.types';
import type { IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { defineStore } from 'pinia';
import type {
	IDataObject,
	ExecutionSummary,
	INodeCredentials,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IWorkflowSettings,
	ITaskStartedData,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/app/api/workflows';
import { useUIStore } from '@/app/stores/ui.store';
import { makeRestApiRequest, ResponseError, type WorkflowHistory } from '@n8n/rest-api-client';
import { unflattenExecutionData } from '@/features/execution/executions/executions.utils';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { i18n } from '@n8n/i18n';

import { computed, ref } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import { useSettingsStore } from './settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { hasRole } from '@/app/utils/rbac/checks';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, () => {
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const sourceControlStore = useSourceControlStore();
	const workflowsListStore = useWorkflowsListStore();

	/**
	 * @deprecated use useWorkflowId() in Vue components/composables instead.
	 */
	const workflowId = ref('');

	// --- Compatibility adapter wiring ---
	//
	// Per-workflow session state (active/previous execution id, webhook wait,
	// debug mode, chat, trigger selection, current executions list, last
	// successful execution) lives in `workflowExecutionState` keyed by
	// workflowId. The fields below are writable computeds that route through
	// the session store so existing direct-state mutations via
	// `createTestingPinia` keep working.
	//
	// Execution-data refs (`workflowExecutionData`, `workflowExecutionStartedData`,
	// `workflowExecutionResultDataLastUpdate`, `workflowExecutionPairedItemMappings`)
	// remain workflow-store-local for now. They will migrate to the
	// per-execution `executionData` store in M5/M6 alongside push-handler and
	// read-consumer migrations, where the refactor of writers/readers can be
	// done together to preserve test contracts.

	const currentState = computed(() =>
		useWorkflowExecutionStateStore(createWorkflowExecutionStateId(workflowId.value)),
	);

	const currentWorkflowExecutions = computed<ExecutionSummary[]>({
		get: () => currentState.value.currentWorkflowExecutions as ExecutionSummary[],
		set: (value) => currentState.value.setCurrentWorkflowExecutions([...value]),
	});

	const workflowExecutionData = computed<IExecutionResponse | null>(() => {
		// Access the timestamp to establish a dependency — in-place mutations to the
		// execution data store update this timestamp, which forces this computed to
		// re-evaluate even when the execution object reference doesn't change.
		const eid = resolveActiveExecId();
		if (eid) {
			void useExecutionDataStore(createExecutionDataId(eid)).executionResultDataLastUpdate;
		}
		return currentState.value.activeExecution as IExecutionResponse | null;
	});
	const lastSuccessfulExecution = computed<IExecutionResponse | null>(
		() => currentState.value.lastSuccessfulExecution as IExecutionResponse | null,
	);
	const workflowExecutionStartedData = computed(() => {
		const eid = resolveActiveExecId();
		if (!eid) return undefined;
		return useExecutionDataStore(createExecutionDataId(eid)).executionStartedData as
			| [executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]
			| undefined;
	});
	const workflowExecutionResultDataLastUpdate = computed(() => {
		const eid = resolveActiveExecId();
		if (!eid) return undefined;
		return useExecutionDataStore(createExecutionDataId(eid)).executionResultDataLastUpdate;
	});
	const workflowExecutionPairedItemMappings = computed(() => {
		const eid = resolveActiveExecId();
		if (!eid) return {} as Record<string, Set<string>>;
		return useExecutionDataStore(createExecutionDataId(eid)).executionPairedItemMappings as Record<
			string,
			Set<string>
		>;
	});

	const executionWaitingForWebhook = computed<boolean>({
		get: () => currentState.value.executionWaitingForWebhook,
		set: (value) => currentState.value.setExecutionWaitingForWebhook(value),
	});

	const isInDebugMode = computed<boolean>({
		get: () => currentState.value.isInDebugMode,
		set: (value) => currentState.value.setIsInDebugMode(value),
	});

	const chatMessages = computed<string[]>(() => currentState.value.chatMessages as string[]);

	const chatPartialExecutionDestinationNode = computed<string | null>({
		get: () => currentState.value.chatPartialExecutionDestinationNode,
		set: (value) => currentState.value.setChatPartialExecutionDestinationNode(value),
	});

	const selectedTriggerNodeName = computed<string | undefined>({
		get: () => currentState.value.selectedTriggerNodeName,
		set: (value) => currentState.value.setSelectedTriggerNodeName(value),
	});

	// A workflow is new if it hasn't been saved to the backend yet.
	// TODO: move to workflowDocumentStore after `workflow` ref is removed from this store.
	// When moved, preserve the `workflowsListStore.getWorkflowById` coupling — pure
	// `workflowId === ''` semantics regress the imported-workflow-with-stale-ID case.
	const isNewWorkflow = computed(() => {
		if (!workflowId.value) return true;

		// Check if the workflow exists in workflowsById
		const existingWorkflow = workflowsListStore.getWorkflowById(workflowId.value);
		// If workflow doesn't exist in the store or has no ID, it's new
		return !existingWorkflow?.id;
	});

	// A workflow is new if it hasn't been saved to the backend yet
	const isWorkflowSaved = computed(() => {
		return Object.keys(workflowsListStore.workflowsById).reduce<Record<string, boolean>>(
			(acc, workflowId) => {
				acc[workflowId] = true;
				return acc;
			},
			{},
		);
	});

	const getWorkflowRunData = computed<IRunData | null>(() => {
		if (!workflowExecutionData.value?.data?.resultData) {
			return null;
		}

		return workflowExecutionData.value.data.resultData.runData;
	});

	const isWorkflowRunning = computed(() => {
		if (activeExecutionId.value === null) {
			return true;
		} else if (activeExecutionId.value && workflowExecutionData.value) {
			if (
				['waiting', 'running'].includes(workflowExecutionData.value.status) &&
				!workflowExecutionData.value.finished
			) {
				return true;
			}
		}

		return false;
	});

	const executedNode = computed(() => workflowExecutionData.value?.executedNode);

	const getAllLoadedFinishedExecutions = computed(() => {
		return currentWorkflowExecutions.value.filter(
			(ex) => ex.finished === true || ex.stoppedAt !== undefined,
		);
	});

	const getWorkflowExecution = computed(() => workflowExecutionData.value);

	const getPastChatMessages = computed(() => chatMessages.value);

	const canViewWorkflows = computed(
		() => !settingsStore.isChatFeatureEnabled || !hasRole(['global:chatUser']),
	);

	/**
	 * Active execution id (tri-state):
	 *   - undefined → no active execution being tracked
	 *   - null      → execution started but backend id not yet known
	 *   - string    → active backend execution id
	 *
	 * Routes through the per-workflow session store. Exposed as a writable
	 * computed so existing test setups that mutate via `createTestingPinia`
	 * continue to work.
	 */
	const activeExecutionId = computed<string | null | undefined>({
		get: () => currentState.value.activeExecutionId,
		set: (value) => currentState.value.setActiveExecutionId(value),
	});
	const readonlyActiveExecutionId = computed(() => currentState.value.activeExecutionId);
	const readonlyPreviousExecutionId = computed(() => currentState.value.previousExecutionId);

	function setActiveExecutionId(id: string | null | undefined) {
		currentState.value.setActiveExecutionId(id);
	}

	function getWorkflowResultDataByNodeName(nodeName: string): ITaskData[] | null {
		if (getWorkflowRunData.value === null) {
			return null;
		}
		if (!getWorkflowRunData.value.hasOwnProperty(nodeName)) {
			return null;
		}
		return getWorkflowRunData.value[nodeName];
	}

	// Finds a uniquely identifying partial id for a node, relying on order for uniqueness in edge cases
	function getPartialIdForNode(fullId: string): string {
		for (let length = 6; length < fullId.length; ++length) {
			const partialId = fullId.slice(0, length);
			if (
				useWorkflowDocumentStore(createWorkflowDocumentId(workflowId.value)).allNodes.filter((x) =>
					x.id.startsWith(partialId),
				).length === 1
			) {
				return partialId;
			}
		}
		return fullId;
	}

	function getExecutionDataById(id: string): ExecutionSummary | undefined {
		return currentWorkflowExecutions.value.find((execution) => execution.id === id);
	}

	function convertTemplateNodeToNodeUi(node: IWorkflowTemplateNode): INodeUi {
		const filteredCredentials = Object.keys(node.credentials ?? {}).reduce<INodeCredentials>(
			(credentials, curr) => {
				const credential = node?.credentials?.[curr];
				if (!credential || typeof credential === 'string') {
					return credentials;
				}

				credentials[curr] = credential;

				return credentials;
			},
			{},
		);

		return {
			...node,
			credentials: filteredCredentials,
		};
	}

	async function getWorkflowFromUrl(url: string, projectId: string): Promise<IWorkflowDb> {
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/workflows/from-url', {
			url,
			projectId,
		});
	}

	async function fetchLastSuccessfulExecution() {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowId.value),
		);
		const workflowPermissions = getResourcePermissions(workflowDocumentStore.scopes).workflow;

		try {
			const wfId = workflowId.value;
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(wfId));

			if (
				isNewWorkflow.value ||
				sourceControlStore.preferences.branchReadOnly ||
				uiStore.isReadOnlyView ||
				!workflowPermissions.update ||
				workflowDocumentStore.isArchived
			) {
				return;
			}

			currentState.value.setLastSuccessfulExecution(
				await workflowsApi.getLastSuccessfulExecution(rootStore.restApiContext, workflowId.value),
			);
		} catch (e: unknown) {
			// no need to do anything if fails
		}
	}

	async function getActivationError(id: string): Promise<string | undefined> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/active-workflows/error/${id}`,
		);
	}

	function setWorkflowId(id?: string) {
		workflowId.value = id || '';
	}

	function resetWorkflow() {
		const previousId = workflowId.value;
		workflowId.value = '';
		if (previousId) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(previousId));
			workflowDocumentStore.reset();
		}
	}

	function setWorkflowActiveVersion(version: WorkflowHistory | null) {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowId.value),
		);
		workflowDocumentStore.setActiveVersion(deepCopy(version));
	}

	async function archiveWorkflow(id: string, expectedChecksum?: string) {
		const updatedWorkflow = await workflowsListStore.archiveWorkflowInList(id, expectedChecksum);
		setWorkflowInactive(id);

		if (id === workflowId.value) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setIsArchived(true);
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum!);
		}
	}

	async function unarchiveWorkflow(id: string) {
		const updatedWorkflow = await workflowsListStore.unarchiveWorkflowInList(id);

		if (id === workflowId.value) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setIsArchived(false);
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum!);
		}
	}

	function setWorkflowActive(
		targetWorkflowId: string,
		activeVersion: WorkflowHistory,
		clearDirtyState: boolean,
	) {
		workflowsListStore.setWorkflowActiveInCache(targetWorkflowId, activeVersion);

		if (targetWorkflowId === workflowId.value && clearDirtyState) {
			uiStore.markStateClean();
		}
	}

	function setWorkflowInactive(targetWorkflowId: string) {
		workflowsListStore.setWorkflowInactiveInCache(targetWorkflowId);
	}

	async function getDuplicateCurrentWorkflowName(currentWorkflowName: string): Promise<string> {
		if (
			currentWorkflowName &&
			currentWorkflowName.length + DUPLICATE_POSTFFIX.length >= MAX_WORKFLOW_NAME_LENGTH
		) {
			return currentWorkflowName;
		}

		let newName = `${currentWorkflowName}${DUPLICATE_POSTFFIX}`;
		try {
			const newWorkflow = await workflowsApi.getNewWorkflow(rootStore.restApiContext, {
				name: newName,
			});
			newName = newWorkflow.name;
		} catch (e) {}
		return newName;
	}

	function resolveActiveExecId(): string | undefined {
		if (typeof currentState.value.activeExecutionId === 'string')
			return currentState.value.activeExecutionId;
		if (currentState.value.activeExecutionId === null) return IN_PROGRESS_EXECUTION_ID;
		const displayedExecutionId = currentState.value.displayedExecutionId;
		if (typeof displayedExecutionId === 'string') return displayedExecutionId;
		return undefined;
	}

	function setWorkflowExecutionRunData(workflowResultData: IRunExecutionData) {
		const activeExecutionId = resolveActiveExecId();
		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).setExecutionRunData(
				workflowResultData,
			);
		}
	}

	function setWorkflowExecutionData(execution: IExecutionResponse | null): void {
		if (execution === null) {
			currentState.value.setPendingExecution(null);
			currentState.value.clearDisplayedExecution();
		} else if (execution.id === IN_PROGRESS_EXECUTION_ID) {
			currentState.value.setPendingExecution(execution);
			currentState.value.setActiveExecutionId(null);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				execution,
			);
		} else {
			currentState.value.trackExecutionId(execution.id);
			useExecutionDataStore(createExecutionDataId(execution.id)).setExecution(execution);
			// Ensure the data is visible through the computed chain.
			// When activeExecutionId isn't yet pointing at this execution,
			// clear pending state and set displayedExecutionId so reads see it.
			if (typeof currentState.value.activeExecutionId !== 'string') {
				currentState.value.setPendingExecution(null);
				currentState.value.setActiveExecutionId(undefined);
				currentState.value.setDisplayedExecutionId(execution.id);
			}
		}
	}

	function clearExecutionStartedData(): void {
		const activeExecutionId = resolveActiveExecId();
		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).clearExecutionStartedData();
		}
	}

	function setExecutionWaitingForWebhook(value: boolean): void {
		currentState.value.setExecutionWaitingForWebhook(value);
	}

	function setIsInDebugMode(value: boolean): void {
		currentState.value.setIsInDebugMode(value);
	}

	function setChatPartialExecutionDestinationNode(value: string | null): void {
		currentState.value.setChatPartialExecutionDestinationNode(value);
	}

	function setLastSuccessfulExecution(execution: IExecutionResponse | null): void {
		currentState.value.setLastSuccessfulExecution(execution);
	}

	function clearCurrentWorkflowExecutions(): void {
		currentState.value.clearCurrentWorkflowExecutions();
	}

	function setCurrentWorkflowExecutions(executions: ExecutionSummary[]): void {
		currentState.value.setCurrentWorkflowExecutions(executions);
	}

	function renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
		uiStore.markStateDirty();

		// Execution-data rename (runData keys, pinData, sources, workflowData, executedNode)
		const activeExecutionId = resolveActiveExecId();
		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).renameExecutionDataNode(
				nameData.old,
				nameData.new,
			);
		}

		// Session-level rename (selectedTriggerNodeName + chatPartialDest).
		currentState.value.renameExecutionStateNode(nameData.old, nameData.new);

		// In case the renamed node was last selected set it also there with the new name
		if (uiStore.lastSelectedNode === nameData.old) {
			uiStore.lastSelectedNode = nameData.new;
		}

		if (workflowId.value) {
			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowId.value),
			);
			workflowDocumentStore.renameNodeMetadata(nameData.old, nameData.new);
			workflowDocumentStore.renamePinDataNode(nameData.old, nameData.new);
		}
	}

	function addNodeExecutionStartedData(data: NodeExecuteBefore['data']): void {
		const activeExecutionId = resolveActiveExecId();
		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).addNodeExecutionStartedData(
				data,
			);
		}
	}

	function clearNodeExecutionData(nodeName: string): void {
		currentState.value.clearActiveNodeExecutionData(nodeName);
	}

	function activeNode(): INodeUi | null {
		// kept here for FE hooks
		const ndvStore = useNDVStore();
		return ndvStore.activeNode;
	}

	// TODO: For sure needs some kind of default filter like last day, with max 10 results, ...
	async function getPastExecutions(
		filter: IDataObject,
		limit: number,
		lastId?: string,
		firstId?: string,
	): Promise<IExecutionsListResponse> {
		let sendData = {};
		if (filter) {
			sendData = {
				filter,
				firstId,
				lastId,
				limit,
			};
		}
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/executions', sendData);
	}

	async function getExecution(id: string): Promise<IExecutionResponse | undefined> {
		const response = await makeRestApiRequest<IExecutionFlattedResponse | undefined>(
			rootStore.restApiContext,
			'GET',
			`/executions/${id}`,
		);

		return response && unflattenExecutionData(response);
	}

	/**
	 * Check if workflow contains any node from specified package
	 * by performing a quick check based on the node type name.
	 */
	function containsNodeFromPackage(workflow: IWorkflowDb, packageName: string) {
		return workflow.nodes.some((node) => node.type.startsWith(packageName));
	}

	/**
	 * Creates a new workflow with the provided data.
	 * Ensures that the new workflow is not active upon creation.
	 * If the project ID is not provided in the data, it assigns the current project ID from the project store.
	 */
	async function createNewWorkflow(sendData: WorkflowDataCreate): Promise<IWorkflowDb> {
		// make sure that the new ones are not active
		sendData.active = false;

		// When activation is false, ensure MCP is disabled
		if (!sendData.settings) {
			sendData.settings ??= {};
		}
		sendData.settings.availableInMCP = false;

		const projectStore = useProjectsStore();

		if (!sendData.projectId && projectStore.currentProjectId) {
			(sendData as unknown as IDataObject).projectId = projectStore.currentProjectId;
		}

		const newWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			'/workflows',
			sendData as unknown as IDataObject,
		);

		const isAIWorkflow = containsNodeFromPackage(newWorkflow, AI_NODES_PACKAGE_NAME);
		if (isAIWorkflow && !usersStore.isEasyAIWorkflowOnboardingDone) {
			await updateCurrentUserSettings(rootStore.restApiContext, {
				easyAIWorkflowOnboarded: true,
			});
			usersStore.setEasyAIWorkflowOnboardingDone();
		}

		return newWorkflow;
	}

	async function updateWorkflow(
		id: string,
		data: WorkflowDataUpdate,
		forceSave = false,
	): Promise<IWorkflowDb> {
		if (data.settings === null) {
			data.settings = undefined;
		}

		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'PATCH',
			`/workflows/${id}${forceSave ? '?forceSave=true' : ''}`,
			data as unknown as IDataObject,
		);

		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to update workflow');
		}

		if (id === workflowId.value) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
		}

		if (
			containsNodeFromPackage(updatedWorkflow, AI_NODES_PACKAGE_NAME) &&
			!usersStore.isEasyAIWorkflowOnboardingDone
		) {
			await updateCurrentUserSettings(rootStore.restApiContext, {
				easyAIWorkflowOnboarded: true,
			});
			usersStore.setEasyAIWorkflowOnboardingDone();
		}

		return updatedWorkflow;
	}

	async function publishWorkflow(
		id: string,
		data: { versionId: string; name?: string; description?: string; expectedChecksum?: string },
	): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/activate`,
			data as unknown as IDataObject,
		);

		return updatedWorkflow;
	}

	async function deactivateWorkflow(id: string, expectedChecksum?: string): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/deactivate`,
			{ expectedChecksum },
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to deactivate workflow');
		}

		setWorkflowInactive(id);

		if (id === workflowId.value) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
		}

		return updatedWorkflow;
	}

	// Update a single workflow setting key while preserving existing settings
	async function updateWorkflowSetting<K extends keyof IWorkflowSettings>(
		id: string,
		key: K,
		value: IWorkflowSettings[K],
	): Promise<IWorkflowDb> {
		// Determine current settings and versionId for the target workflow
		let currentSettings: IWorkflowSettings = {} as IWorkflowSettings;
		let currentVersionId = '';
		let currentChecksum = '';
		const isCurrentWorkflow = id === workflowId.value;
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));

		if (isCurrentWorkflow) {
			currentSettings = workflowDocumentStore.settings;
			currentVersionId = workflowDocumentStore.versionId;
			currentChecksum = workflowDocumentStore.checksum;
		} else {
			const cached = workflowsListStore.getWorkflowById(id);
			if (cached && cached.versionId) {
				currentSettings = cached.settings ?? ({} as IWorkflowSettings);
				currentVersionId = cached.versionId;
			} else {
				const fetched = await workflowsListStore.fetchWorkflow(id);
				currentSettings = fetched.settings ?? ({} as IWorkflowSettings);
				currentVersionId = fetched.versionId;
			}
		}

		const newSettings: IWorkflowSettings = {
			...(currentSettings ?? ({} as IWorkflowSettings)),
			[key]: value,
		};

		const updated = await updateWorkflow(id, {
			versionId: currentVersionId,
			settings: newSettings,
			...(currentChecksum ? { expectedChecksum: currentChecksum } : {}),
		});

		// Update local store state to reflect the change
		if (isCurrentWorkflow) {
			workflowDocumentStore.setSettings(updated.settings ?? {});
		} else if (workflowsListStore.getWorkflowById(id)) {
			workflowsListStore.updateWorkflowInCache(id, {
				settings: updated.settings,
				versionId: updated.versionId,
			});
		}

		return updated;
	}

	async function runWorkflow(startRunData: IStartRunData): Promise<IExecutionPushResponse> {
		try {
			return await makeRestApiRequest(
				rootStore.restApiContext,
				'POST',
				`/workflows/${startRunData.workflowId}/run`,
				startRunData as unknown as IDataObject,
			);
		} catch (error) {
			if (error.response?.status === 413) {
				throw new ResponseError(i18n.baseText('workflowRun.showError.payloadTooLarge'), {
					errorCode: 413,
					httpStatusCode: 413,
				});
			}
			throw error;
		}
	}

	async function removeTestWebhook(targetWorkflowId: string): Promise<boolean> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'DELETE',
			`/test-webhook/${targetWorkflowId}`,
		);
	}

	async function fetchExecutionDataById(
		executionId: string,
		queryParams?: ExecutionRedactionQueryDto,
	): Promise<IExecutionResponse | null> {
		const response = await workflowsApi.getExecutionData(
			rootStore.restApiContext,
			executionId,
			queryParams,
		);
		return response && unflattenExecutionData(response);
	}

	function deleteExecution(execution: ExecutionSummary): void {
		currentState.value.deleteExecution(execution);
	}

	function addToCurrentExecutions(executions: ExecutionSummary[]): void {
		currentState.value.addToCurrentExecutions(executions);
	}

	function getBinaryUrl(
		binaryDataId: string,
		action: 'view' | 'download',
		fileName: string,
		mimeType: string,
	): string {
		let restUrl = rootStore.restUrl;
		if (restUrl.startsWith('/')) restUrl = window.location.origin + restUrl;
		const url = new URL(`${restUrl}/binary-data`);
		url.searchParams.append('id', binaryDataId);
		url.searchParams.append('action', action);
		if (fileName) url.searchParams.append('fileName', fileName);
		if (mimeType) url.searchParams.append('mimeType', mimeType);
		return url.toString();
	}

	function resetChatMessages(): void {
		currentState.value.resetChatMessages();
	}

	function appendChatMessage(message: string): void {
		currentState.value.appendChatMessage(message);
	}

	function setSelectedTriggerNodeName(value: string | undefined) {
		currentState.value.setSelectedTriggerNodeName(value);
	}

	return {
		currentWorkflowExecutions,
		workflowExecutionData,
		workflowExecutionPairedItemMappings,
		workflowExecutionResultDataLastUpdate,
		workflowExecutionStartedData,
		activeExecutionId: readonlyActiveExecutionId,
		previousExecutionId: readonlyPreviousExecutionId,
		executionWaitingForWebhook,
		isInDebugMode,
		chatMessages,
		chatPartialExecutionDestinationNode,
		workflowId,
		isNewWorkflow,
		isWorkflowSaved,
		getWorkflowRunData,
		getWorkflowResultDataByNodeName,
		isWorkflowRunning,
		executedNode,
		getAllLoadedFinishedExecutions,
		getWorkflowExecution,
		getPastChatMessages,
		selectedTriggerNodeName,
		getExecutionDataById,
		convertTemplateNodeToNodeUi,
		getWorkflowFromUrl,
		getActivationError,
		setWorkflowId,
		resetWorkflow,
		addNodeExecutionStartedData,
		setWorkflowActiveVersion,
		archiveWorkflow,
		unarchiveWorkflow,
		setWorkflowActive,
		setWorkflowInactive,
		getDuplicateCurrentWorkflowName,
		setWorkflowExecutionRunData,
		setWorkflowExecutionData,
		clearExecutionStartedData,
		setExecutionWaitingForWebhook,
		setIsInDebugMode,
		setChatPartialExecutionDestinationNode,
		setLastSuccessfulExecution,
		clearCurrentWorkflowExecutions,
		setCurrentWorkflowExecutions,
		renameNodeSelectedAndExecution,
		clearNodeExecutionData,
		activeNode,
		getPastExecutions,
		getExecution,
		createNewWorkflow,
		updateWorkflow,
		publishWorkflow,
		deactivateWorkflow,
		updateWorkflowSetting,
		runWorkflow,
		removeTestWebhook,
		fetchExecutionDataById,
		deleteExecution,
		addToCurrentExecutions,
		getBinaryUrl,
		resetChatMessages,
		appendChatMessage,
		getPartialIdForNode,
		setSelectedTriggerNodeName,
		fetchLastSuccessfulExecution,
		lastSuccessfulExecution,
		canViewWorkflows,
		// This is exposed to ease the refactoring to the injected workflowState composable
		// Please do not use outside this context
		private: {
			setActiveExecutionId,
		},
	};
});
