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
import type { IDataObject, INodeCredentials, IWorkflowSettings } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/app/api/workflows';
import { useUIStore } from '@/app/stores/ui.store';
import { makeRestApiRequest, ResponseError, type WorkflowHistory } from '@n8n/rest-api-client';
import { unflattenExecutionData } from '@/features/execution/executions/executions.utils';
import { i18n } from '@n8n/i18n';

import { computed, ref } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import { useSettingsStore } from './settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { hasRole } from '@/app/utils/rbac/checks';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

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

	const canViewWorkflows = computed(
		() => !settingsStore.isChatFeatureEnabled || !hasRole(['global:chatUser']),
	);

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

			useWorkflowExecutionStateStore(
				createWorkflowDocumentId(workflowId.value),
			).setLastSuccessfulExecution(
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

	function resetWorkflow(outgoingWorkflowId?: string) {
		// Reset the workflow being torn down. Callers pass it explicitly (the route may
		// already point at the next workflow); fall back to the current id otherwise.
		const previousId = outgoingWorkflowId ?? workflowId.value;
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
			currentSettings = workflowDocumentStore.getSettingsSnapshot();
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

	return {
		workflowId,
		isNewWorkflow,
		isWorkflowSaved,
		convertTemplateNodeToNodeUi,
		getWorkflowFromUrl,
		getActivationError,
		setWorkflowId,
		resetWorkflow,
		setWorkflowActiveVersion,
		archiveWorkflow,
		unarchiveWorkflow,
		setWorkflowActive,
		setWorkflowInactive,
		getDuplicateCurrentWorkflowName,
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
		getBinaryUrl,
		getPartialIdForNode,
		fetchLastSuccessfulExecution,
		canViewWorkflows,
	};
});
