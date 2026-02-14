import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { LocationQuery, NavigationGuardNext, useRouter } from 'vue-router';
import { watch } from 'vue';
import { useMessage } from './useMessage';
import { useI18n } from '@n8n/i18n';
import {
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRM,
	VIEWS,
	AutoSaveState,
	DEBOUNCE_TIME,
	getDebounceTime,
} from '@/app/constants';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useCanvasStore } from '@/app/stores/canvas.store';
import type { IUpdateInformation, IWorkflowDb } from '@/Interface';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { isExpression, type IDataObject } from 'n8n-workflow';
import { useToast } from './useToast';
import { useExternalHooks } from './useExternalHooks';
import { useTelemetry } from './useTelemetry';
import { useNodeHelpers } from './useNodeHelpers';
import { tryToParseNumber } from '@/app/utils/typesUtils';
import { isDebouncedFunction } from '@/app/utils/typeGuards';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { injectWorkflowState, type WorkflowState } from '@/app/composables/useWorkflowState';
import { getResourcePermissions } from '@n8n/permissions';
import { useDebounceFn } from '@vueuse/core';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';

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
	const workflowsListStore = useWorkflowsListStore();
	const workflowState = providedWorkflowState ?? injectWorkflowState();
	const focusPanelStore = useFocusPanelStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const templatesStore = useTemplatesStore();
	const builderStore = useBuilderStore();

	const { getWorkflowDataToSave, checkConflictingWebhooks, getWorkflowProjectRole } =
		useWorkflowHelpers();

	const saveStore = useWorkflowSaveStore();
	const backendConnectionStore = useBackendConnectionStore();

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
					await npsSurveyStore.showNpsSurveyIfPossible();
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
		{ id }: { id?: string } = {},
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
		// for autosaves (they will be rescheduled), or wait for pending save to complete
		if (saveStore.pendingSave) {
			if (autosaved) {
				// Autosave will be rescheduled by the finally block of the in-progress save
				return true;
			}

			if (!forceSave) {
				// Wait for the pending save to complete first to avoid race conditions
				await saveStore.pendingSave;
			}
		}

		const savePromise = (async (): Promise<boolean> => {
			// Check if workflow needs to be saved as new (doesn't exist in store yet)
			const existingWorkflow = currentWorkflow
				? workflowsListStore.getWorkflowById(currentWorkflow)
				: null;
			if (!currentWorkflow || !existingWorkflow?.id) {
				const workflowId = await saveAsNewWorkflow(
					{ parentFolderId, uiContext, autosaved },
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
				workflowsStore.setWorkflowVersionData(
					{
						versionId: workflowData.versionId,
						name: null,
						description: null,
					},
					workflowData.checksum,
				);
				workflowState.setWorkflowProperty('updatedAt', workflowData.updatedAt);

				// Only mark state clean if no new changes were made during the save
				if (uiStore.dirtyStateSetCount === dirtyCountBeforeSave) {
					uiStore.markStateClean();
				}
				uiStore.removeActiveAction('workflowSaving');
				void useExternalHooks().run('workflow.afterUpdate', { workflowData });

				// Reset AI Builder edits flag only after successful save
				builderStore.resetAiBuilderMadeEdits();

				// Reset retry count on successful save
				saveStore.resetRetry();

				onSaved?.(false); // Update of existing workflow
				return true;
			} catch (error) {
				console.error(error);

				uiStore.removeActiveAction('workflowSaving');

				if (error.errorCode === 100) {
					telemetry.track('User attempted to save locked workflow', {
						workflowId: currentWorkflow,
						sharing_role: getWorkflowProjectRole(currentWorkflow),
					});

					// Hide modal if we already showed it
					// So that user could explore the workflow
					if (!saveStore.conflictModalShown) {
						if (autosaved) {
							saveStore.setConflictModalShown(true);
						}

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
							return await saveCurrentWorkflow({ id }, redirect, true);
						}
					}

					// For autosaves, fall through to retry logic below
					// As we want to still communicate autosave stopped working
					if (!autosaved) {
						return false;
					}
				}

				// Handle autosave failures with exponential backoff
				if (autosaved) {
					saveStore.incrementRetry();
					saveStore.setLastError(error.message);

					// Schedule retry with exponential backoff
					const retryDelay = saveStore.getRetryDelay();
					saveStore.setRetrying(true);

					setTimeout(() => {
						saveStore.setRetrying(false);
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

				toast.showMessage({
					title: i18n.baseText('workflowHelpers.showMessage.title'),
					message: error.message,
					type: 'error',
				});

				return false;
			}
		})();

		saveStore.setPendingSave(savePromise);

		try {
			return await savePromise;
		} finally {
			// Only clear if this save is still the one marked as pending
			if (saveStore.pendingSave === savePromise) {
				saveStore.setPendingSave(null);
			}
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

			workflowsListStore.addWorkflow(workflowData);

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
			workflowsStore.setWorkflowVersionData(
				{
					versionId: workflowData.versionId,
					name: null,
					description: null,
				},
				workflowData.checksum,
			);
			workflowState.setWorkflowProperty('updatedAt', workflowData.updatedAt);

			// Only update webhook IDs if we explicitly reset them
			if (resetWebhookUrls) {
				Object.keys(changedNodes).forEach((nodeName) => {
					const changes = {
						key: 'webhookId',
						value: changedNodes[nodeName],
						name: nodeName,
					} as IUpdateInformation;
					workflowState.setNodeValue(changes);
				});
			}

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
			if (saveStore.autoSaveState === AutoSaveState.Idle) {
				return;
			}

			// Check if another save is already in progress
			if (saveStore.pendingSave) {
				return;
			}

			saveStore.setAutoSaveState(AutoSaveState.InProgress);

			void (async () => {
				try {
					await saveCurrentWorkflow({}, true, false, true);
				} finally {
					if (saveStore.autoSaveState === AutoSaveState.InProgress) {
						saveStore.setAutoSaveState(AutoSaveState.Idle);
					}
					// If changes were made during save, reschedule autosave
					if (uiStore.stateIsDirty && !saveStore.isRetrying) {
						saveStore.setAutoSaveState(AutoSaveState.Scheduled);
						void autoSaveWorkflowDebounced();
					}
				}
			})();
		},
		getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE),
		{ maxWait: getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE_MAX_WAIT) },
	);

	const scheduleAutoSave = () => {
		// Don't schedule if a save is already in progress - the finally block
		// will reschedule if there are pending changes
		if (saveStore.pendingSave) {
			return;
		}

		// Don't schedule if we're waiting for retry backoff to complete
		if (saveStore.isRetrying) {
			return;
		}

		// Don't schedule if we're offline
		if (!backendConnectionStore.isOnline) {
			return;
		}

		saveStore.setAutoSaveState(AutoSaveState.Scheduled);
		void autoSaveWorkflowDebounced();
	};

	const cancelAutoSave = () => {
		if (isDebouncedFunction(autoSaveWorkflowDebounced)) {
			autoSaveWorkflowDebounced.cancel();
		}
		saveStore.setAutoSaveState(AutoSaveState.Idle);
	};

	// Watch for network coming back online
	watch(
		() => backendConnectionStore.isOnline,
		(isOnline, wasOnline) => {
			if (isOnline && !wasOnline) {
				if (uiStore.stateIsDirty) {
					scheduleAutoSave();
				}
			}
		},
	);

	return {
		promptSaveUnsavedWorkflowChanges,
		saveCurrentWorkflow,
		saveAsNewWorkflow,
		autoSaveWorkflow: scheduleAutoSave,
		cancelAutoSave,
	};
}
