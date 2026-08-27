import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { LocationQuery, NavigationGuardNext, useRouter } from 'vue-router';
import { computed, getCurrentInstance, watch } from 'vue';
import { useEditorContext } from '@/app/composables/useEditorContext';
import { useMessage } from './useMessage';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import {
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRM,
	VIEWS,
	AutoSaveState,
	DEBOUNCE_TIME,
} from '@/app/constants';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useCanvasStore } from '@/app/stores/canvas.store';
import type { IUpdateInformation, IWorkflowDb } from '@/Interface';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { ResponseError } from '@n8n/rest-api-client';
import { isExpression, type IDataObject } from 'n8n-workflow';
import { useToast } from '@n8n/composables/useToast';
import { useExternalHooks } from './useExternalHooks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useNodeHelpers } from './useNodeHelpers';
import { tryToParseNumber } from '@/app/utils/typesUtils';
import { isDebouncedFunction } from '@/app/utils/typeGuards';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useDebounceFn } from '@vueuse/core';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useInvalidNodeGroupCleanup } from '@/app/composables/useInvalidNodeGroupCleanup';

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (error && typeof error === 'object' && 'message' in error) {
		const { message } = error as { message?: unknown };
		if (message !== undefined) {
			return String(message);
		}
	}

	return String(error);
}

function getHttpStatusCode(error: unknown): number | undefined {
	if (error instanceof ResponseError) {
		return error.httpStatusCode;
	}

	if (!error || typeof error !== 'object') {
		return;
	}

	const { httpStatusCode, errorCode, response } = error as {
		httpStatusCode?: unknown;
		errorCode?: unknown;
		response?: unknown;
	};

	if (typeof httpStatusCode === 'number') {
		return httpStatusCode;
	}

	if (response && typeof response === 'object') {
		const { status } = response as { status?: unknown };
		if (typeof status === 'number') {
			return status;
		}
	}

	if (typeof errorCode === 'number' && errorCode >= 400 && errorCode < 600) {
		return errorCode;
	}

	return undefined;
}

function shouldRetryAutoSaveFailure(error: unknown): boolean {
	const statusCode = getHttpStatusCode(error);

	if (!statusCode) {
		return true;
	}

	return [408, 409, 429].includes(statusCode) || statusCode >= 500;
}

export function useWorkflowSaving({
	router,
	onSaved,
	ownsAutoSave = false,
}: {
	router: ReturnType<typeof useRouter>;
	onSaved?: (isFirstSave: boolean) => void;
	/**
	 * Whether this instance drives the canvas's autosave. Only the component
	 * rendering the canvas passes `true`: it sits inside the host that scopes the
	 * editor context, so it is the only one that can tell a preview from an
	 * editable canvas. Everyone else — dialogs, a Pinia store, a push handler —
	 * builds this composable for its explicit save calls, and an autosave engine
	 * there would react to app-wide signals from outside any canvas.
	 */
	ownsAutoSave?: boolean;
}) {
	const uiStore = useUIStore();
	const npsSurveyStore = useNpsSurveyStore();
	const message = useMessage();
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const focusPanelStore = useFocusPanelStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const templatesStore = useTemplatesStore();
	const builderStore = useBuilderStore();

	const { checkConflictingWebhooks, getWorkflowProjectRole } = useWorkflowHelpers();

	const saveStore = useWorkflowSaveStore();
	const backendConnectionStore = useBackendConnectionStore();
	const settingsStore = useSettingsStore();
	const workflowId = useWorkflowId();
	const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();

	function showSaveErrorToast(errorMessage: string, retryDelay?: number) {
		toast.showMessage({
			title: i18n.baseText('workflowHelpers.showMessage.title'),
			message:
				retryDelay === undefined
					? errorMessage
					: i18n.baseText('generic.autosave.retrying', {
							interpolate: {
								error: errorMessage,
								retryIn: `${Math.ceil(retryDelay / 1000)}s`,
							},
						}),
			type: 'error',
			...(retryDelay === undefined ? {} : { duration: retryDelay }),
		});
	}

	function scheduleAutoSaveRetry(retryDelay: number) {
		saveStore.setRetrying(true);

		setTimeout(() => {
			saveStore.setRetrying(false);
			// Trigger autosave again if workflow is still dirty
			if (uiStore.stateIsDirty) {
				scheduleAutoSave();
			}
		}, retryDelay);
	}

	function handleAutoSaveFailure(error: unknown, errorMessage: string): false {
		// Handle autosave failures with exponential backoff
		if (!shouldRetryAutoSaveFailure(error)) {
			saveStore.resetRetry();
			saveStore.setLastError(errorMessage);
			showSaveErrorToast(errorMessage);

			return false;
		}

		saveStore.incrementRetry();
		saveStore.setLastError(errorMessage);

		// Schedule retry with exponential backoff
		const retryDelay = saveStore.getRetryDelay();
		scheduleAutoSaveRetry(retryDelay);
		showSaveErrorToast(errorMessage, retryDelay);

		return false;
	}

	async function handleConflictSaveFailure({
		error,
		errorMessage,
		currentWorkflow,
		id,
		redirect,
		autosaved,
	}: {
		error: unknown;
		errorMessage: string;
		currentWorkflow: string;
		id: string | undefined;
		redirect: boolean;
		autosaved: boolean;
	}): Promise<boolean> {
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
				params: { workflowId: currentWorkflow },
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

		// For autosaves, use retry logic so we still communicate autosave stopped working.
		if (autosaved) {
			return handleAutoSaveFailure(error, errorMessage);
		}

		return false;
	}

	// Preview hosts (template, workflow history, execution) render the real canvas
	// and scope their subtree read-only through the editor context. The context is
	// injected, so it only resolves inside a component — fall back to no context
	// for the out-of-tree callers, the way `useRunWorkflow` does for the same key.
	const editorContext = getCurrentInstance() ? useEditorContext() : undefined;
	const canAutoSave = computed(() => ownsAutoSave && editorContext?.readOnly.value !== true);
	const currentWorkflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowId.value)),
	);

	const canArmAutoSave = computed(() => {
		// Don't schedule from a read-only canvas, or from an instance that doesn't
		// own one. Every autosave entry point funnels through here, so a preview
		// never writes whatever marked it dirty.
		if (!canAutoSave.value) {
			return false;
		}

		// Don't schedule if autosave is disabled via environment variable
		if (!settingsStore.isAutosaveEnabled) {
			return false;
		}

		// Don't schedule if we're offline
		if (!backendConnectionStore.isOnline) {
			return false;
		}

		if (!currentWorkflowDocumentStore.value.hydrated) {
			return false;
		}

		return true;
	});

	const canScheduleAutoSave = computed(() => {
		if (!canArmAutoSave.value) {
			return false;
		}

		// Don't schedule if a save is already in progress - the finally block
		// will reschedule if there are pending changes
		if (saveStore.pendingSave) {
			return false;
		}

		// Don't schedule if we're waiting for retry backoff to complete
		if (saveStore.isRetrying) {
			return false;
		}

		return true;
	});

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
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowId.value),
		);

		if (
			!uiStore.stateIsDirty ||
			workflowDocumentStore.isArchived ||
			!getResourcePermissions(workflowDocumentStore.scopes).workflow.update
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
				cancelAutoSave();
				next();

				return;
			case MODAL_CLOSE:
				// For new workflows that are not saved yet, don't do anything, only close modal
				if (workflowsStore.isWorkflowSaved[workflowId.value]) {
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
				params: { workflowId: workflowId.value },
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
		const currentWorkflow = id ?? workflowId.value;
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
			let isExistingWorkflowSave = false;

			try {
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

				isExistingWorkflowSave = true;
				// Workflow exists already so update it
				if (!forceSave && isLoading) {
					return true;
				}

				const workflowDocumentStore = useWorkflowDocumentStore(
					createWorkflowDocumentId(currentWorkflow),
				);

				// Ungroup node groups this version can't save (e.g. groups created on a
				// newer n8n version) so the request isn't rejected on every (auto)save.
				// Runs before the dirty-count capture so the removal doesn't keep the
				// state dirty after a successful save.
				removeInvalidNodeGroups(workflowDocumentStore);

				// Capture dirty state count before save to detect changes made during save
				const dirtyCountBeforeSave = uiStore.dirtyStateSetCount;

				const workflowDataRequest: WorkflowDataUpdate = workflowDocumentStore.serialize();
				// This can happen if the user has another workflow in the browser history and navigates
				// via the browser back button, encountering our warning dialog with the new route already set
				if (workflowDataRequest.id !== currentWorkflow) {
					throw new Error('Attempted to save a workflow different from the current workflow');
				}

				// Check if AI Builder made edits since last save
				workflowDataRequest.aiBuilderAssisted = builderStore.getAiBuilderMadeEdits();
				workflowDataRequest.versionId = workflowDocumentStore.versionId;
				workflowDataRequest.expectedChecksum = workflowDocumentStore.checksum;
				workflowDataRequest.autosaved = autosaved;

				const workflowData = await workflowsStore.updateWorkflow(
					currentWorkflow,
					workflowDataRequest,
					forceSave,
				);
				if (!workflowData.checksum) {
					throw new Error('Failed to update workflow');
				}
				workflowDocumentStore.setVersionData({
					versionId: workflowData.versionId,
					name: null,
					description: null,
				});
				workflowDocumentStore.setUpdatedAt(workflowData.updatedAt);

				// Only mark state clean if no new changes were made during the save
				if (uiStore.dirtyStateSetCount === dirtyCountBeforeSave) {
					uiStore.markStateClean();
					// A completed manual save supersedes any scheduled autosave.
					// Disarming it keeps the timer from firing after a
					// save-then-navigate, where the route no longer resolves a
					// workflow id and the autosave would create an empty workflow.
					if (!autosaved) cancelAutoSave();
				}
				void useExternalHooks().run('workflow.afterUpdate', { workflowData });

				// Reset AI Builder edits flag only after successful save
				builderStore.resetAiBuilderMadeEdits();

				// Reset retry count on successful save
				saveStore.resetRetry();

				onSaved?.(false); // Update of existing workflow
				return true;
			} catch (error) {
				const errorMessage = getErrorMessage(error);
				console.error(error);

				if (isExistingWorkflowSave && getHttpStatusCode(error) === 409) {
					return await handleConflictSaveFailure({
						error,
						errorMessage,
						currentWorkflow,
						id,
						redirect,
						autosaved,
					});
				}

				if (autosaved) {
					return handleAutoSaveFailure(error, errorMessage);
				}

				showSaveErrorToast(errorMessage);

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
		let createRequestFailed = false;

		try {
			const currentDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowId.value),
			);

			if (!data) {
				removeInvalidNodeGroups(currentDocumentStore);
			}

			// Capture dirty state count before save to detect changes made during save
			const dirtyCountBeforeSave = uiStore.dirtyStateSetCount;

			const workflowDataRequest: WorkflowDataCreate = data || currentDocumentStore.serialize();
			// A description staged on an unsaved workflow (via the description and
			// tags modal) is not part of serialize(), so carry it into the first save.
			if (!data && currentDocumentStore.description) {
				workflowDataRequest.description = currentDocumentStore.description;
			}
			const changedNodes = {} as IDataObject;

			if (requestNewId) {
				delete workflowDataRequest.id;
			}

			if (resetNodeIds) {
				const nodeIdMap = new Map<string, string>();
				workflowDataRequest.nodes = workflowDataRequest.nodes!.map((node) => {
					const oldId = node.id;
					nodeHelpers.assignNodeId(node);
					if (oldId) nodeIdMap.set(oldId, node.id);
					return node;
				});

				if (workflowDataRequest.nodeGroups?.length) {
					workflowDataRequest.nodeGroups = workflowDataRequest.nodeGroups.map((group) => ({
						...group,
						nodeIds: group.nodeIds.map((id) => nodeIdMap.get(id) ?? id),
					}));
				}
			}

			if (resetWebhookUrls) {
				workflowDataRequest.nodes = workflowDataRequest.nodes!.map((node) => {
					if (node.webhookId) {
						const newId = nodeHelpers.assignWebhookId(node);

						// Triggers whose webhook path comes from the node description (e.g. Trello
						// Trigger, Wait) have no `path` parameter to re-key.
						if ('path' in node.parameters && !isExpression(node.parameters.path)) {
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

			let workflowData: IWorkflowDb;
			try {
				workflowData = await workflowsStore.createNewWorkflow(workflowDataRequest);
			} catch (e) {
				createRequestFailed = true;
				throw e;
			}

			workflowsListStore.addWorkflow(workflowData);

			focusPanelStore.onNewWorkflowSave(workflowData.id);

			if (openInNewWindow) {
				const routeData = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId: workflowData.id },
				});
				window.open(routeData.href, '_blank');
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

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowData.id),
			);
			workflowDocumentStore.setActiveState({
				activeVersionId: workflowData.activeVersionId,
				activeVersion: workflowData.activeVersion ?? null,
			});
			if (workflowData.checksum) {
				workflowDocumentStore.setChecksum(workflowData.checksum);
			}
			workflowsStore.setWorkflowId(workflowData.id);
			workflowDocumentStore.setVersionData({
				versionId: workflowData.versionId,
				name: null,
				description: null,
			});
			workflowDocumentStore.setUpdatedAt(workflowData.updatedAt);

			if (workflowData.settings) {
				workflowDocumentStore.setSettings(workflowData.settings);
			}

			// Only update webhook IDs if we explicitly reset them
			if (resetWebhookUrls) {
				Object.keys(changedNodes).forEach((nodeName) => {
					const changes = {
						key: 'webhookId',
						value: changedNodes[nodeName],
						name: nodeName,
					} as IUpdateInformation;
					workflowDocumentStore.setNodeValue(changes);
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

			// Only mark state clean if no new changes were made during the save
			if (uiStore.dirtyStateSetCount === dirtyCountBeforeSave) {
				uiStore.markStateClean();
				// A completed manual save supersedes any scheduled autosave (see
				// the same disarm in the update path above).
				if (!autosaved) cancelAutoSave();
			}
			void useExternalHooks().run('workflow.afterUpdate', { workflowData });

			onSaved?.(true); // First save of new workflow
			return workflowData.id;
		} catch (e) {
			if (autosaved && createRequestFailed) {
				throw e;
			}

			if (autosaved) {
				// The create request already succeeded; retrying this autosave
				// would POST the same new workflow again.
				console.error(e);
				return null;
			}

			showSaveErrorToast(getErrorMessage(e));

			return null;
		}
	}

	const autoSaveWorkflowDebounced = useDebounceFn(
		() => {
			// Check if cancelled during debounce period
			if (saveStore.autoSaveState === AutoSaveState.Idle) {
				return;
			}

			if (!uiStore.stateIsDirty || !canScheduleAutoSave.value) {
				saveStore.setAutoSaveState(AutoSaveState.Idle);
				return;
			}

			saveStore.setAutoSaveState(AutoSaveState.InProgress);

			void (async () => {
				let saved = false;
				try {
					saved = await saveCurrentWorkflow({}, true, false, true);
				} finally {
					if (saveStore.autoSaveState === AutoSaveState.InProgress) {
						saveStore.setAutoSaveState(AutoSaveState.Idle);
					}
					// If changes were made during save, reschedule autosave
					if (saved && uiStore.stateIsDirty && canScheduleAutoSave.value) {
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
		if (!canScheduleAutoSave.value) {
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

	// These watchers write on their own, off app-wide signals, so only the canvas's
	// owner arms them. A non-owner instance armed them too, and outside a canvas
	// host there is no read-only scope to consult — which is how a preview still
	// issued a save when the connection returned. They are also unstopped, so the
	// push handler that builds this composable per message would leak one apiece.
	if (ownsAutoSave) {
		// Re-arm when a host lifts read-only with changes still pending — the
		// Instance AI preview locks the canvas while its agent edits, and nothing
		// else would save what the agent wrote. Mirrors the AI-builder re-arm in
		// NodeView.
		// Watch for network coming back online, and for other autosave eligibility
		// returning after document hydration.
		watch(canArmAutoSave, (allowed, wasAllowed) => {
			if (allowed && !wasAllowed && uiStore.stateIsDirty) {
				scheduleAutoSave();
			}
		});
	}

	return {
		promptSaveUnsavedWorkflowChanges,
		saveCurrentWorkflow,
		saveAsNewWorkflow,
		autoSaveWorkflow: scheduleAutoSave,
		cancelAutoSave,
	};
}
