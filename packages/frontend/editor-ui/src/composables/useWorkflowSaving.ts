import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useUIStore } from '@/stores/ui.store';
import type { NavigationGuardNext, useRouter } from 'vue-router';
import { useMessage } from './useMessage';
import { useI18n } from '@n8n/i18n';
import {
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRM,
	NON_ACTIVATABLE_TRIGGER_NODE_TYPES,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
} from '@/constants';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useCanvasStore } from '@/stores/canvas.store';
import type { IUpdateInformation, IWorkflowDb, NotificationOptions } from '@/Interface';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import type { IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useToast } from './useToast';
import { useExternalHooks } from './useExternalHooks';
import { useTelemetry } from './useTelemetry';
import { useNodeHelpers } from './useNodeHelpers';
import { tryToParseNumber } from '@/utils/typesUtils';
import { useTemplatesStore } from '@/stores/templates.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';

export function useWorkflowSaving({ router }: { router: ReturnType<typeof useRouter> }) {
	const uiStore = useUIStore();
	const npsSurveyStore = useNpsSurveyStore();
	const message = useMessage();
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const focusPanelStore = useFocusPanelStore();
	const nodeTypesStore = useNodeTypesStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const templatesStore = useTemplatesStore();

	const { getWorkflowDataToSave, checkConflictingWebhooks, getWorkflowProjectRole } =
		useWorkflowHelpers();

	async function promptSaveUnsavedWorkflowChanges(
		next: NavigationGuardNext,
		{
			confirm = async () => true,
			cancel = async () => {},
		}: {
			confirm?: () => Promise<boolean>;
			cancel?: () => Promise<void>;
		} = {},
	) {
		if (!uiStore.stateIsDirty || workflowsStore.workflow.isArchived) {
			next();
			return;
		}

		const response = await message.confirm(
			i18n.baseText('generic.unsavedWork.confirmMessage.message'),
			{
				title: i18n.baseText('generic.unsavedWork.confirmMessage.headline'),
				type: 'warning',
				confirmButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
				cancelButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
				showClose: true,
			},
		);

		switch (response) {
			case MODAL_CONFIRM:
				const saved = await saveCurrentWorkflow({}, false);

				if (saved) {
					await npsSurveyStore.fetchPromptsData();
					uiStore.stateIsDirty = false;
					const goToNext = await confirm();
					next(goToNext);
				} else {
					// if new workflow and did not save, modal reopens again to force user to try to save again
					stayOnCurrentWorkflow(next);
				}

				return;
			case MODAL_CANCEL:
				await cancel();

				uiStore.stateIsDirty = false;
				next();

				return;
			case MODAL_CLOSE:
				// for new workflows that are not saved yet, don't do anything, only close modal
				if (workflowsStore.workflow.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					stayOnCurrentWorkflow(next);
				}

				return;
		}
	}

	function stayOnCurrentWorkflow(next: NavigationGuardNext) {
		// The route may have already changed due to the browser back button, so let's restore it
		next(
			router.resolve({
				name: VIEWS.WORKFLOW,
				params: { name: workflowsStore.workflow.id },
			}),
		);
	}

	function isNodeActivatable(node: INode): boolean {
		if (node.disabled) {
			return false;
		}

		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

		return (
			nodeType !== null &&
			nodeType.group.includes('trigger') &&
			!NON_ACTIVATABLE_TRIGGER_NODE_TYPES.includes(node.type)
		);
	}

	async function getWorkflowDeactivationInfo(
		workflowId: string,
		request: WorkflowDataUpdate,
	): Promise<Partial<NotificationOptions> | undefined> {
		const missingActivatableTriggerNode =
			request.nodes !== undefined && !request.nodes.some(isNodeActivatable);

		if (missingActivatableTriggerNode) {
			// Automatically deactivate if all activatable triggers are removed
			return {
				title: i18n.baseText('workflows.deactivated'),
				message: i18n.baseText('workflowActivator.thisWorkflowHasNoTriggerNodes'),
				type: 'info',
			};
		}

		const conflictData = await checkConflictingWebhooks(workflowId);

		if (conflictData) {
			// Workflow should not be active if there is live webhook with the same path
			return {
				title: 'Conflicting Webhook Path',
				message: `Workflow set to inactive: Workflow set to inactive: Live webhook in another workflow uses same path as node '${conflictData.trigger.name}'.`,
				type: 'error',
			};
		}

		return undefined;
	}

	async function saveCurrentWorkflow(
		{ id, name, tags }: { id?: string; name?: string; tags?: string[] } = {},
		redirect = true,
		forceSave = false,
	): Promise<boolean> {
		const readOnlyEnv = useSourceControlStore().preferences.branchReadOnly;
		if (readOnlyEnv) {
			return false;
		}

		const isLoading = useCanvasStore().isLoading;
		const currentWorkflow = id || (router.currentRoute.value.params.name as string);
		const parentFolderId = router.currentRoute.value.query.parentFolderId as string;

		if (!currentWorkflow || ['new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(currentWorkflow)) {
			return !!(await saveAsNewWorkflow({ name, tags, parentFolderId }, redirect));
		}

		// Workflow exists already so update it
		try {
			if (!forceSave && isLoading) {
				return true;
			}
			uiStore.addActiveAction('workflowSaving');

			const workflowDataRequest: WorkflowDataUpdate = await getWorkflowDataToSave();
			// This can happen if the user has another workflow in the browser history and navigates
			// via the browser back button, encountering our warning dialog with the new route already set
			if (workflowDataRequest.id !== currentWorkflow) {
				throw new Error('Attempted to save a workflow different from the current workflow');
			}

			if (name) {
				workflowDataRequest.name = name.trim();
			}

			if (tags) {
				workflowDataRequest.tags = tags;
			}

			workflowDataRequest.versionId = workflowsStore.workflowVersionId;

			const deactivateReason = await getWorkflowDeactivationInfo(
				currentWorkflow,
				workflowDataRequest,
			);

			if (deactivateReason !== undefined) {
				workflowDataRequest.active = false;

				if (workflowsStore.isWorkflowActive) {
					toast.showMessage(deactivateReason);

					workflowsStore.setWorkflowInactive(currentWorkflow);
				}
			}
			const workflowData = await workflowsStore.updateWorkflow(
				currentWorkflow,
				workflowDataRequest,
				forceSave,
			);
			workflowsStore.setWorkflowVersionId(workflowData.versionId);

			if (name) {
				workflowsStore.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
			}

			if (tags) {
				const createdTags = (workflowData.tags || []) as ITag[];
				const tagIds = createdTags.map((tag: ITag): string => tag.id);
				workflowsStore.setWorkflowTagIds(tagIds);
			}

			uiStore.stateIsDirty = false;
			uiStore.removeActiveAction('workflowSaving');
			void useExternalHooks().run('workflow.afterUpdate', { workflowData });

			return true;
		} catch (error) {
			console.error(error);

			uiStore.removeActiveAction('workflowSaving');

			if (error.errorCode === 100) {
				telemetry.track('User attempted to save locked workflow', {
					workflowId: currentWorkflow,
					sharing_role: getWorkflowProjectRole(currentWorkflow),
				});

				const url = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { name: currentWorkflow },
				}).href;

				const overwrite = await message.confirm(
					i18n.baseText('workflows.concurrentChanges.confirmMessage.message', {
						interpolate: {
							url,
						},
					}),
					i18n.baseText('workflows.concurrentChanges.confirmMessage.title'),
					{
						confirmButtonText: i18n.baseText(
							'workflows.concurrentChanges.confirmMessage.confirmButtonText',
						),
						cancelButtonText: i18n.baseText(
							'workflows.concurrentChanges.confirmMessage.cancelButtonText',
						),
					},
				);

				if (overwrite === MODAL_CONFIRM) {
					return await saveCurrentWorkflow({ id, name, tags }, redirect, true);
				}

				return false;
			}

			toast.showMessage({
				title: i18n.baseText('workflowHelpers.showMessage.title'),
				message: error.message,
				type: 'error',
			});

			return false;
		}
	}

	async function saveAsNewWorkflow(
		{
			name,
			tags,
			resetWebhookUrls,
			resetNodeIds,
			openInNewWindow,
			parentFolderId,
			data,
		}: {
			name?: string;
			tags?: string[];
			resetWebhookUrls?: boolean;
			openInNewWindow?: boolean;
			resetNodeIds?: boolean;
			parentFolderId?: string;
			data?: WorkflowDataCreate;
		} = {},
		redirect = true,
	): Promise<IWorkflowDb['id'] | null> {
		try {
			uiStore.addActiveAction('workflowSaving');

			const workflowDataRequest: WorkflowDataCreate = data || (await getWorkflowDataToSave());
			const changedNodes = {} as IDataObject;

			if (resetNodeIds) {
				workflowDataRequest.nodes = workflowDataRequest.nodes!.map((node) => {
					nodeHelpers.assignNodeId(node);

					return node;
				});
			}

			if (resetWebhookUrls) {
				workflowDataRequest.nodes = workflowDataRequest.nodes!.map((node) => {
					if (node.webhookId) {
						const newId = nodeHelpers.assignWebhookId(node);
						node.parameters.path = newId;
						changedNodes[node.name] = node.webhookId;
					}
					return node;
				});
			}

			if (name) {
				workflowDataRequest.name = name.trim();
			}

			if (tags) {
				workflowDataRequest.tags = tags;
			}

			if (parentFolderId) {
				workflowDataRequest.parentFolderId = parentFolderId;
			}
			const workflowData = await workflowsStore.createNewWorkflow(workflowDataRequest);

			workflowsStore.addWorkflow(workflowData);

			focusPanelStore.onNewWorkflowSave(workflowData.id);

			if (openInNewWindow) {
				const routeData = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { name: workflowData.id },
				});
				window.open(routeData.href, '_blank');
				uiStore.removeActiveAction('workflowSaving');
				return workflowData.id;
			}

			// workflow should not be active if there is live webhook with the same path
			if (workflowData.active) {
				const conflict = await checkConflictingWebhooks(workflowData.id);
				if (conflict) {
					workflowData.active = false;

					toast.showMessage({
						title: 'Conflicting Webhook Path',
						message: `Workflow set to inactive: Live webhook in another workflow uses same path as node '${conflict.trigger.name}'.`,
						type: 'error',
					});
				}
			}

			workflowsStore.setActive(workflowData.active || false);
			workflowsStore.setWorkflowId(workflowData.id);
			workflowsStore.setWorkflowVersionId(workflowData.versionId);
			workflowsStore.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
			workflowsStore.setWorkflowSettings((workflowData.settings as IWorkflowSettings) || {});
			uiStore.stateIsDirty = false;
			Object.keys(changedNodes).forEach((nodeName) => {
				const changes = {
					key: 'webhookId',
					value: changedNodes[nodeName],
					name: nodeName,
				} as IUpdateInformation;
				workflowsStore.setNodeValue(changes);
			});

			const createdTags = (workflowData.tags || []) as ITag[];
			const tagIds = createdTags.map((tag: ITag) => tag.id);
			workflowsStore.setWorkflowTagIds(tagIds);

			const templateId = router.currentRoute.value.query.templateId;
			if (templateId) {
				telemetry.track('User saved new workflow from template', {
					template_id: tryToParseNumber(String(templateId)),
					workflow_id: workflowData.id,
					wf_template_repo_session_id: templatesStore.previousSessionId,
				});
			}

			if (redirect) {
				await router.replace({
					name: VIEWS.WORKFLOW,
					params: { name: workflowData.id },
					query: { action: 'workflowSave' },
				});
			}

			uiStore.removeActiveAction('workflowSaving');
			uiStore.stateIsDirty = false;
			void useExternalHooks().run('workflow.afterUpdate', { workflowData });

			return workflowData.id;
		} catch (e) {
			uiStore.removeActiveAction('workflowSaving');

			toast.showMessage({
				title: i18n.baseText('workflowHelpers.showMessage.title'),
				message: (e as Error).message,
				type: 'error',
			});

			return null;
		}
	}

	return {
		promptSaveUnsavedWorkflowChanges,
		saveCurrentWorkflow,
		saveAsNewWorkflow,
	};
}
