import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { LocationQuery, NavigationGuardNext, useRouter } from 'vue-router';
import { useMessage } from './useMessage';
import { useI18n } from '@n8n/i18n';
import { MODAL_CANCEL, MODAL_CLOSE, MODAL_CONFIRM, VIEWS, AutoSaveState } from '@/app/constants';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useCanvasStore } from '@/app/stores/canvas.store';
import type { IUpdateInformation, IWorkflowDb } from '@/Interface';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { isExpression, type IDataObject, type IWorkflowSettings } from 'n8n-workflow';
import { useToast } from './useToast';
import { useExternalHooks } from './useExternalHooks';
import { useTelemetry } from './useTelemetry';
import { useNodeHelpers } from './useNodeHelpers';
import { tryToParseNumber } from '@/app/utils/typesUtils';
import { isDebouncedFunction } from '@/app/utils/typeGuards';
import { convertWorkflowTagsToIds } from '@/app/utils/workflowUtils';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { injectWorkflowState, type WorkflowState } from '@/app/composables/useWorkflowState';
import { getResourcePermissions } from '@n8n/permissions';
import { useDebounceFn } from '@vueuse/core';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';

export function useWorkflowSaving({
	router,
	workflowState: providedWorkflowState,
	onSaved,
}: {
	router: ReturnType<typeof useRouter>;
	workflowState?: WorkflowState;
	onSaved?: (isFirstSave: boolean) => void;
}) {
	const uiStore = useUIStore();
	const npsSurveyStore = useNpsSurveyStore();
	const message = useMessage();
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowState = providedWorkflowState ?? injectWorkflowState();
	const focusPanelStore = useFocusPanelStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const templatesStore = useTemplatesStore();
	const builderStore = useBuilderStore();

	const { getWorkflowDataToSave, checkConflictingWebhooks, getWorkflowProjectRole } =
		useWorkflowHelpers();

	const autosaveStore = useWorkflowAutosaveStore();

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
		if (
			!uiStore.stateIsDirty ||
			workflowsStore.workflow.isArchived ||
			!getResourcePermissions(workflowsStore.workflow.scopes).workflow.update
		) {
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
					uiStore.markStateClean();
					const goToNext = await confirm();
					next(goToNext);
				} else {
					// if new workflow and did not save, modal reopens again to force user to try to save again
					stayOnCurrentWorkflow(next);
				}

				return;
			case MODAL_CANCEL:
				await cancel();

				uiStore.markStateClean();
				next();

				return;
			case MODAL_CLOSE:
				// For new workflows that are not saved yet, don't do anything, only close modal
				if (workflowsStore.isWorkflowSaved[workflowsStore.workflowId]) {
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

	function getQueryParam(query: LocationQuery, key: string): string | undefined {
		const value = query[key];
		if (Array.isArray(value)) return value[0] ?? undefined;
		if (value === null) return undefined;
		return value;
	}

	async function saveCurrentWorkflow(
		{ id, name, tags }: { id?: string; name?: string; tags?: string[] } = {},
		redirect = true,
		forceSave = false,
		autosaved = false,
	): Promise<boolean> {
		const readOnlyEnv = useSourceControlStore().preferences.branchReadOnly;
		if (readOnlyEnv) {
			return false;
		}

		const isLoading = useCanvasStore().isLoading;
		const currentWorkflow = id ?? getQueryParam(router.currentRoute.value.params, 'name');
		const parentFolderId = getQueryParam(router.currentRoute.value.query, 'parentFolderId');
		const uiContext = getQueryParam(router.currentRoute.value.query, 'uiContext');

		// Prevent concurrent saves - if a save is already in progress, skip this one
		// for autosaves (they will be rescheduled), or wait for non-autosaves
		if (uiStore.isActionActive.workflowSaving) {
			if (autosaved) {
				// Autosave will be rescheduled by the finally block of the in-progress save
				return true;
			}
			// For manual saves, wait for the pending autosave to complete first
			if (autosaveStore.pendingAutoSave) {
				await autosaveStore.pendingAutoSave;
			}
		}

		// Check if workflow needs to be saved as new (doesn't exist in store yet)
		const existingWorkflow = currentWorkflow ? workflowsStore.workflowsById[currentWorkflow] : null;
		if (!currentWorkflow || !existingWorkflow?.id) {
			const workflowId = await saveAsNewWorkflow(
				{ name, tags, parentFolderId, uiContext, autosaved },
				redirect,
			);
			return !!workflowId;
		}

		// Workflow exists already so update it
		try {
			if (!forceSave && isLoading) {
				return true;
			}
			uiStore.addActiveAction('workflowSaving');

			// Capture dirty state count before save to detect changes made during save
			const dirtyCountBeforeSave = uiStore.dirtyStateSetCount;

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
			// Check if AI Builder made edits since last save
			workflowDataRequest.aiBuilderAssisted = builderStore.getAiBuilderMadeEdits();
			workflowDataRequest.expectedChecksum = workflowsStore.workflowChecksum;
			workflowDataRequest.autosaved = autosaved;

			const workflowData = await workflowsStore.updateWorkflow(
				currentWorkflow,
				workflowDataRequest,
				forceSave,
			);
			if (!workflowData.checksum) {
				throw new Error('Failed to update workflow');
			}
			workflowsStore.setWorkflowVersionId(workflowData.versionId, workflowData.checksum);
			workflowState.setWorkflowProperty('updatedAt', workflowData.updatedAt);

			if (name) {
				workflowState.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
			}

			if (tags) {
				workflowState.setWorkflowTagIds(convertWorkflowTagsToIds(workflowData.tags));
			}

			// Only mark state clean if no new changes were made during the save
			if (uiStore.dirtyStateSetCount === dirtyCountBeforeSave) {
				uiStore.markStateClean();
			}
			uiStore.removeActiveAction('workflowSaving');
			void useExternalHooks().run('workflow.afterUpdate', { workflowData });

			// Reset AI Builder edits flag only after successful save
			builderStore.resetAiBuilderMadeEdits();

			// Reset retry count on successful save
			autosaveStore.resetRetry();

			onSaved?.(false); // Update of existing workflow
			return true;
		} catch (error) {
			console.error(error);

			uiStore.removeActiveAction('workflowSaving');

			// Handle autosave failures with exponential backoff
			if (autosaved) {
				autosaveStore.incrementRetry();
				autosaveStore.setLastError(error.message);

				// Schedule retry with exponential backoff
				const retryDelay = autosaveStore.getRetryDelay();
				autosaveStore.setRetrying(true);

				setTimeout(() => {
					autosaveStore.setRetrying(false);
					// Trigger autosave again if workflow is still dirty
					if (uiStore.stateIsDirty) {
						scheduleAutoSave();
					}
				}, retryDelay);

				toast.showMessage({
					title: i18n.baseText('workflowHelpers.showMessage.title'),
					message: i18n.baseText('generic.autosave.retrying', {
						interpolate: {
							error: error.message,
							retryIn: `${Math.ceil(retryDelay / 1000)}s`,
						},
					}),
					type: 'error',
					duration: retryDelay,
				});

				return false;
			}

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
			uiContext,
			requestNewId,
			data,
			autosaved,
		}: {
			name?: string;
			tags?: string[];
			resetWebhookUrls?: boolean;
			openInNewWindow?: boolean;
			resetNodeIds?: boolean;
			requestNewId?: boolean;
			parentFolderId?: string;
			uiContext?: string;
			data?: WorkflowDataCreate;
			autosaved?: boolean;
		} = {},
		redirect = true,
	): Promise<IWorkflowDb['id'] | null> {
		try {
			uiStore.addActiveAction('workflowSaving');

			// Capture dirty state count before save to detect changes made during save
			const dirtyCountBeforeSave = uiStore.dirtyStateSetCount;

			const workflowDataRequest: WorkflowDataCreate = data || (await getWorkflowDataToSave());
			const changedNodes = {} as IDataObject;

			if (requestNewId) {
				delete workflowDataRequest.id;
			}

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

						if (!isExpression(node.parameters.path)) {
							node.parameters.path = newId;
						}

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

			if (uiContext) {
				workflowDataRequest.uiContext = uiContext;
			}

			if (autosaved) {
				workflowDataRequest.autosaved = autosaved;
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
				onSaved?.(true); // First save of new workflow
				return workflowData.id;
			}

			// workflow should not be active if there is live webhook with the same path
			if (workflowData.activeVersionId !== null) {
				const conflict = await checkConflictingWebhooks(workflowData.id);
				if (conflict) {
					workflowData.active = false;
					workflowData.activeVersionId = null;

					toast.showMessage({
						title: 'Conflicting Webhook Path',
						message: `Workflow set to inactive: Live webhook in another workflow uses same path as node '${conflict.trigger.name}'.`,
						type: 'error',
					});
				}
			}

			workflowState.setActive(workflowData.activeVersionId);
			workflowState.setWorkflowId(workflowData.id);
			workflowsStore.setWorkflowVersionId(workflowData.versionId);
			workflowState.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
			workflowState.setWorkflowSettings((workflowData.settings as IWorkflowSettings) || {});
			workflowState.setWorkflowProperty('updatedAt', workflowData.updatedAt);

			Object.keys(changedNodes).forEach((nodeName) => {
				const changes = {
					key: 'webhookId',
					value: changedNodes[nodeName],
					name: nodeName,
				} as IUpdateInformation;
				workflowState.setNodeValue(changes);
			});

			workflowState.setWorkflowTagIds(convertWorkflowTagsToIds(workflowData.tags));

			const route = router.currentRoute.value;
			const templateId = route.query.templateId;
			if (templateId) {
				telemetry.track('User saved new workflow from template', {
					template_id: tryToParseNumber(String(templateId)),
					workflow_id: workflowData.id,
					wf_template_repo_session_id: templatesStore.previousSessionId,
				});
			}

			if (redirect) {
				await router.replace({
					name: route.name,
					params: { ...route.params },
					query: { ...route.query, new: undefined },
				});
			}

			uiStore.removeActiveAction('workflowSaving');
			// Only mark state clean if no new changes were made during the save
			if (uiStore.dirtyStateSetCount === dirtyCountBeforeSave) {
				uiStore.markStateClean();
			}
			void useExternalHooks().run('workflow.afterUpdate', { workflowData });

			onSaved?.(true); // First save of new workflow
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

	const autoSaveWorkflowDebounced = useDebounceFn(
		() => {
			// Check if cancelled during debounce period
			if (autosaveStore.autoSaveState === AutoSaveState.Idle) {
				return;
			}

			autosaveStore.setAutoSaveState(AutoSaveState.InProgress);

			const savePromise = (async () => {
				try {
					await saveCurrentWorkflow({}, true, false, true);
				} finally {
					if (autosaveStore.autoSaveState === AutoSaveState.InProgress) {
						autosaveStore.setAutoSaveState(AutoSaveState.Idle);
					}
					// If changes were made during save, reschedule autosave
					if (uiStore.stateIsDirty && !autosaveStore.isRetrying) {
						autosaveStore.setAutoSaveState(AutoSaveState.Scheduled);
						void autoSaveWorkflowDebounced();
					}
				}
			})();

			autosaveStore.setPendingAutoSave(savePromise);
		},
		1500,
		{ maxWait: 5000 },
	);

	const scheduleAutoSave = () => {
		// Don't schedule if a save is already in progress - the finally block
		// will reschedule if there are pending changes
		if (autosaveStore.autoSaveState === AutoSaveState.InProgress) {
			return;
		}

		// Don't schedule if we're waiting for retry backoff to complete
		if (autosaveStore.isRetrying) {
			return;
		}

		autosaveStore.setAutoSaveState(AutoSaveState.Scheduled);
		void autoSaveWorkflowDebounced();
	};

	const cancelAutoSave = () => {
		if (isDebouncedFunction(autoSaveWorkflowDebounced)) {
			autoSaveWorkflowDebounced.cancel();
		}
		autosaveStore.setAutoSaveState(AutoSaveState.Idle);
	};

	return {
		promptSaveUnsavedWorkflowChanges,
		saveCurrentWorkflow,
		saveAsNewWorkflow,
		autoSaveWorkflow: scheduleAutoSave,
		cancelAutoSave,
	};
}
