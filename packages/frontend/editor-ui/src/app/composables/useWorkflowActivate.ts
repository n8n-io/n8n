import { useStorage } from '@n8n/composables/useStorage';

import {
	LOCAL_STORAGE_ACTIVATION_FLAG,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { getCurrentScope, onScopeDispose, ref } from 'vue';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useActivationError } from '@/app/composables/useActivationError';
import type { INode } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import type { ResponseError } from '@n8n/rest-api-client/utils';
import type { findWebhook } from '@n8n/rest-api-client/api/webhooks';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	registerPendingActivationModal,
	clearPendingActivationModal,
} from '@/app/composables/workflowPublicationConfirmation';

export function useWorkflowActivate() {
	const updatingWorkflowActivation = ref(false);
	const activationErrorNodeId = ref<string | undefined>();

	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const pushConnectionStore = usePushConnectionStore();
	const pendingListeners = new Set<() => void>();
	if (getCurrentScope()) {
		onScopeDispose(() => {
			for (const removeListener of pendingListeners) removeListener();
			pendingListeners.clear();
		});
	}
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const collaborationStore = useCollaborationStore();
	const { errorMessage: activationErrorMessage } = useActivationError(activationErrorNodeId);

	const parseWebhookConflictError = (error: ResponseError) => {
		try {
			const { errorCode, hint } = error;
			if (errorCode === 409) {
				const parsedHint = JSON.parse(hint ?? '') as Array<{
					trigger: INode;
					conflict: Awaited<ReturnType<typeof findWebhook>>;
				}>;
				if (
					Array.isArray(parsedHint) &&
					parsedHint.length > 0 &&
					Object.hasOwn(parsedHint[0] as object, 'trigger')
				) {
					return parsedHint;
				}
			}
			return null;
		} catch {
			return null;
		}
	};

	const handleWebhookConflictError = async (error: ResponseError) => {
		const { trigger, conflict } = parseWebhookConflictError(error)?.pop() || {};
		let workflowName = conflict?.workflowId;
		try {
			if (conflict?.workflowId) {
				const conflictingWorkflow = await workflowsListStore.fetchWorkflow(conflict?.workflowId);
				workflowName = conflictingWorkflow.name;
			}
		} catch {}

		uiStore.openModalWithData({
			name: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerType: trigger?.type,
				workflowName,
				...conflict,
			},
		});
	};

	const isWebhookConflictError = (error: ResponseError) => {
		return parseWebhookConflictError(error) !== null;
	};

	type PublishConfirmation = { source: 'response'; workflow: IWorkflowDb } | { source: 'push' };

	/**
	 * Race the `/activate` request against the push message that reports the new
	 * active version. Either one confirms the publish: the response can arrive late
	 * or never, and the push carries no payload. A retry can publish the same
	 * version without changing the document's IDs, so match the raw message.
	 */
	const publishWithConfirmation = async (
		workflowId: string,
		versionId: string,
		payload: { name?: string; description?: string; expectedChecksum?: string },
	): Promise<PublishConfirmation> => {
		let removeListener: (() => void) | undefined;
		try {
			const confirmedByPush = new Promise<PublishConfirmation>((resolve) => {
				removeListener = pushConnectionStore.addEventListener((message) => {
					if (
						(message.type === 'workflowActivated' ||
							message.type === 'workflowPartiallyActivated') &&
						message.data.workflowId === workflowId &&
						message.data.activeVersionId === versionId
					) {
						resolve({ source: 'push' });
					}
				});
				pendingListeners.add(removeListener);
			});

			const confirmedByResponse = workflowsStore
				.publishWorkflow(workflowId, { versionId, ...payload })
				.then((workflow): PublishConfirmation => ({ source: 'response', workflow }));

			return await Promise.race([confirmedByPush, confirmedByResponse]);
		} finally {
			if (removeListener) {
				removeListener();
				pendingListeners.delete(removeListener);
			}
		}
	};

	/**
	 * Return the published workflow to apply. The push carries no workflow payload
	 * and callers read the list cache as soon as `publishWorkflow` resolves, so
	 * refresh the cache on that path. Best effort: the publish is already confirmed.
	 */
	const resolvePublishedWorkflow = async (
		confirmation: PublishConfirmation,
		workflowId: string,
	): Promise<IWorkflowDb | null> => {
		if (confirmation.source === 'push') {
			return await workflowsListStore.fetchWorkflow(workflowId).catch(() => null);
		}
		if (!confirmation.workflow.activeVersion || !confirmation.workflow.checksum) {
			throw new Error('Failed to publish workflow');
		}
		return confirmation.workflow;
	};

	const applyPublishedWorkflowState = (
		workflowId: string,
		workflow: IWorkflowDb,
		confirmedBy: PublishConfirmation['source'],
	) => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		if (!workflow.activeVersion) return;

		workflowsStore.setWorkflowActive(workflowId, workflow.activeVersion, true);
		workflowDocumentStore.setActiveState({
			activeVersionId: workflow.activeVersion.versionId,
			activeVersion: workflow.activeVersion,
		});

		// On the push path the publication already completed and the push handler
		// set its terminal status; writing "publishing" would regress it.
		if (confirmedBy === 'response' && useSettingsStore().isWorkflowPublicationServiceEnabled) {
			workflowDocumentStore.setPublicationStatus({ status: 'publishing' });
		}

		// Re-read the flag after the request: the editor may have closed while it
		// was in flight.
		if (workflowDocumentStore.hydrated) {
			workflowDocumentStore.setVersionData({
				versionId: workflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			if (workflow.checksum) {
				workflowDocumentStore.setChecksum(workflow.checksum);
			}
		}
	};

	const publishWorkflow = async (
		workflowId: string,
		versionId: string,
		options?: { name?: string; description?: string },
	) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));

		// The list cache misses a workflow it never paged in, such as the one behind
		// an embedded editor. Read the open document there, so a miss does not
		// count as a first publish.
		const cachedWorkflow = workflowsListStore.getWorkflowById(workflowId);
		const hadPublishedVersion = cachedWorkflow
			? !!cachedWorkflow.activeVersion
			: workflowDocumentStore.hydrated && workflowDocumentStore.active;

		if (!hadPublishedVersion) {
			const telemetryPayload = {
				workflow_id: workflowId,
				is_active: true,
				previous_status: false,
				ndv_input: false,
			};
			void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);
		}

		// With the publication service (and in multi-main setups on the legacy
		// path), trigger registration completes asynchronously after the publish
		// request: the real outcome arrives as a workflowActivated /
		// workflowFailedToActivate push. Showing the success modal on the API
		// response would contradict a failure push that arrives moments later
		// (ADO-4969), so defer it until the confirming push.
		const settingsStore = useSettingsStore();
		const activationIsConfirmedByPush =
			settingsStore.isWorkflowPublicationServiceEnabled || settingsStore.isMultiMain;
		const shouldShowActivationModal =
			!hadPublishedVersion && useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value !== 'true';

		if (activationIsConfirmedByPush && shouldShowActivationModal) {
			// Register before the request: on a fast local drain the confirming
			// push can arrive before the response does.
			registerPendingActivationModal(workflowId, versionId);
		}

		try {
			// A hydrated document is open in an editor, routed or embedded (assistant artifact).
			// The route id is empty on the assistant page and the publish modal is global, so
			// neither can tell whether this workflow is on screen.
			const expectedChecksum = workflowDocumentStore.hydrated
				? workflowDocumentStore.checksum
				: undefined;

			const confirmation = await publishWithConfirmation(workflowId, versionId, {
				name: options?.name,
				description: options?.description,
				expectedChecksum,
			});
			const publishedWorkflow = await resolvePublishedWorkflow(confirmation, workflowId);
			if (publishedWorkflow) {
				applyPublishedWorkflowState(workflowId, publishedWorkflow, confirmation.source);
			}

			void useExternalHooks().run('workflow.published', {
				workflowId,
				versionId: publishedWorkflow?.activeVersion?.versionId ?? versionId,
			});

			if (shouldShowActivationModal && !activationIsConfirmedByPush) {
				uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
			}
			return { success: true };
		} catch (error) {
			clearPendingActivationModal(workflowId);

			if (isWebhookConflictError(error)) {
				await handleWebhookConflictError(error);
				return { success: false, errorHandled: true };
			} else {
				activationErrorNodeId.value = error.meta?.nodeId as string | undefined;
				const title = i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName: 'published' },
				});
				toast.showError(error, title, {
					message: activationErrorMessage.value,
					description: error.meta?.description as string | undefined,
				});

				// Only update workflow state to inactive if this is not a validation error
				if (!error.meta?.validationError) {
					workflowsStore.setWorkflowInactive(workflowId);
					workflowDocumentStore.setActiveState({
						activeVersionId: null,
						activeVersion: null,
					});
				}
			}
			return { success: false, errorHandled: true };
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	const unpublishWorkflowFromHistory = async (workflowId: string) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		const wasPublished = !!workflowsListStore.getWorkflowById(workflowId)?.activeVersion;

		const telemetryPayload = {
			workflow_id: workflowId,
			is_active: false,
			previous_status: wasPublished,
			ndv_input: false,
		};

		telemetry.track('User set workflow active status', telemetryPayload);
		void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		try {
			const expectedChecksum = workflowDocumentStore.hydrated
				? workflowDocumentStore.checksum
				: undefined;

			await workflowsStore.deactivateWorkflow(workflowId, expectedChecksum);
			workflowDocumentStore.setActiveState({
				activeVersionId: null,
				activeVersion: null,
			});

			void useExternalHooks().run('workflow.unpublished', {
				workflowId,
			});

			return true;
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName: 'deactivated' },
				}) + ':',
			);
			return false;
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	return {
		updatingWorkflowActivation,
		publishWorkflow,
		unpublishWorkflowFromHistory,
	};
}
