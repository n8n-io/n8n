import { Mf as getCurrentScope, Nf as init_reactivity_esm_bundler, Rf as onScopeDispose, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Cx as WORKFLOW_HISTORY_PUBLISH_MODAL_KEY, Jg as useUIStore, Od as useWorkflowsStore, Tx as WORKFLOW_PUBLISH_MODAL_KEY, Uf as getPolicyViolations, Wp as useWorkflowsListStore, Xc as usePushConnectionStore, Xd as createWorkflowDocumentId, Yc as useCollaborationStore, Yu as usePolicyViolationToast, _x as WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY, dC as useToast, hC as useTelemetry, jN as useI18n, nf as useWorkflowDocumentStore, pC as useStorage, vd as useExternalHooks, vx as WORKFLOW_ACTIVE_MODAL_KEY, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { i as registerPendingActivationModal, n as clearPendingActivationModal, t as useActivationError } from "./useActivationError-eDI8nRN9.js";
//#region src/app/composables/useWorkflowActivate.ts
init_reactivity_esm_bundler();
function useWorkflowActivate() {
	const updatingWorkflowActivation = ref(false);
	const activationErrorNodeId = ref();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const pushConnectionStore = usePushConnectionStore();
	const pendingListeners = /* @__PURE__ */ new Set();
	if (getCurrentScope()) onScopeDispose(() => {
		for (const removeListener of pendingListeners) removeListener();
		pendingListeners.clear();
	});
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const collaborationStore = useCollaborationStore();
	const { errorMessage: activationErrorMessage } = useActivationError(activationErrorNodeId);
	const { showPolicyViolationToast, closePolicyViolationToast } = usePolicyViolationToast();
	const parseWebhookConflictError = (error) => {
		try {
			const { errorCode, hint } = error;
			if (errorCode === 409) {
				const parsedHint = JSON.parse(hint ?? "");
				if (Array.isArray(parsedHint) && parsedHint.length > 0 && Object.hasOwn(parsedHint[0], "trigger")) return parsedHint;
			}
			return null;
		} catch {
			return null;
		}
	};
	const handleWebhookConflictError = async (error) => {
		const { trigger, conflict } = parseWebhookConflictError(error)?.pop() || {};
		let workflowName = conflict?.workflowId;
		try {
			if (conflict?.workflowId) workflowName = (await workflowsListStore.fetchWorkflow(conflict?.workflowId)).name;
		} catch {}
		uiStore.openModalWithData({
			name: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerType: trigger?.type,
				workflowName,
				...conflict
			}
		});
	};
	const isWebhookConflictError = (error) => {
		return parseWebhookConflictError(error) !== null;
	};
	/**
	* Race the `/activate` request against the push message that reports the new
	* active version. Either one confirms the publish: the response can arrive late
	* or never, and the push carries no payload. A retry can publish the same
	* version without changing the document's IDs, so match the raw message.
	*/
	const publishWithConfirmation = async (workflowId, versionId, payload) => {
		let removeListener;
		try {
			const confirmedByPush = new Promise((resolve) => {
				removeListener = pushConnectionStore.addEventListener((message) => {
					if ((message.type === "workflowActivated" || message.type === "workflowPartiallyActivated") && message.data.workflowId === workflowId && message.data.activeVersionId === versionId) resolve({ source: "push" });
				});
				pendingListeners.add(removeListener);
			});
			const confirmedByResponse = workflowsStore.publishWorkflow(workflowId, {
				versionId,
				...payload
			}).then((workflow) => ({
				source: "response",
				workflow
			}));
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
	const resolvePublishedWorkflow = async (confirmation, workflowId) => {
		if (confirmation.source === "push") return await workflowsListStore.fetchWorkflow(workflowId).catch(() => null);
		if (!confirmation.workflow.activeVersion || !confirmation.workflow.checksum) throw new Error("Failed to publish workflow");
		return confirmation.workflow;
	};
	const applyPublishedWorkflowState = (workflowId, workflow, confirmedBy) => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		if (!workflow.activeVersion) return;
		workflowsStore.setWorkflowActive(workflowId, workflow.activeVersion, true);
		workflowDocumentStore.setActiveState({
			activeVersionId: workflow.activeVersion.versionId,
			activeVersion: workflow.activeVersion
		});
		if (confirmedBy === "response" && useSettingsStore().isWorkflowPublicationServiceEnabled) workflowDocumentStore.setPublicationStatus({ status: "publishing" });
		if (workflowDocumentStore.hydrated) {
			workflowDocumentStore.setVersionData({
				versionId: workflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null
			});
			if (workflow.checksum) workflowDocumentStore.setChecksum(workflow.checksum);
		}
	};
	const publishWorkflow = async (workflowId, versionId, options) => {
		updatingWorkflowActivation.value = true;
		collaborationStore.requestWriteAccess();
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		const cachedWorkflow = workflowsListStore.getWorkflowById(workflowId);
		const hadPublishedVersion = cachedWorkflow ? !!cachedWorkflow.activeVersion : workflowDocumentStore.hydrated && workflowDocumentStore.active;
		if (!hadPublishedVersion) {
			const telemetryPayload = {
				workflow_id: workflowId,
				is_active: true,
				previous_status: false,
				ndv_input: false
			};
			useExternalHooks().run("workflowActivate.updateWorkflowActivation", telemetryPayload);
		}
		const settingsStore = useSettingsStore();
		const activationIsConfirmedByPush = settingsStore.isWorkflowPublicationServiceEnabled || settingsStore.isMultiMain;
		const shouldShowActivationModal = !hadPublishedVersion && useStorage("N8N_HIDE_ACTIVATION_ALERT").value !== "true";
		if (activationIsConfirmedByPush && shouldShowActivationModal) registerPendingActivationModal(workflowId, versionId);
		try {
			const expectedChecksum = workflowDocumentStore.hydrated ? workflowDocumentStore.checksum : void 0;
			const confirmation = await publishWithConfirmation(workflowId, versionId, {
				name: options?.name,
				description: options?.description,
				expectedChecksum
			});
			const publishedWorkflow = await resolvePublishedWorkflow(confirmation, workflowId);
			if (publishedWorkflow) applyPublishedWorkflowState(workflowId, publishedWorkflow, confirmation.source);
			useExternalHooks().run("workflow.published", {
				workflowId,
				versionId: publishedWorkflow?.activeVersion?.versionId ?? versionId
			});
			if (shouldShowActivationModal && !activationIsConfirmedByPush) uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
			closePolicyViolationToast("publish");
			return { success: true };
		} catch (error) {
			clearPendingActivationModal(workflowId);
			if (isWebhookConflictError(error)) {
				await handleWebhookConflictError(error);
				return {
					success: false,
					errorHandled: true
				};
			} else {
				const title = i18n.baseText("workflowActivator.showError.title", { interpolate: { newStateName: "published" } });
				const policyTitle = i18n.baseText("typeAvailabilityPolicies.violations.publishTitle");
				const violations = getPolicyViolations(error);
				if (error.meta?.reason === "review_required") {
					useSettingsStore().setWorkflowReviewsPolicy({
						enabled: true,
						alwaysRequired: true
					});
					uiStore.closeModal(WORKFLOW_PUBLISH_MODAL_KEY);
					uiStore.closeModal(WORKFLOW_HISTORY_PUBLISH_MODAL_KEY);
				}
				if (violations) showPolicyViolationToast(violations, policyTitle, "publish", createWorkflowDocumentId(workflowId));
				else {
					activationErrorNodeId.value = error.meta?.nodeId;
					toast.showError(error, title, {
						message: activationErrorMessage.value,
						description: error.meta?.description
					});
				}
				if (!error.meta?.validationError && !violations) {
					workflowsStore.setWorkflowInactive(workflowId);
					workflowDocumentStore.setActiveState({
						activeVersionId: null,
						activeVersion: null
					});
				}
			}
			return {
				success: false,
				errorHandled: true
			};
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};
	const unpublishWorkflowFromHistory = async (workflowId) => {
		updatingWorkflowActivation.value = true;
		collaborationStore.requestWriteAccess();
		const telemetryPayload = {
			workflow_id: workflowId,
			is_active: false,
			previous_status: !!workflowsListStore.getWorkflowById(workflowId)?.activeVersion,
			ndv_input: false
		};
		telemetry.track("User set workflow active status", telemetryPayload);
		useExternalHooks().run("workflowActivate.updateWorkflowActivation", telemetryPayload);
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		try {
			const expectedChecksum = workflowDocumentStore.hydrated ? workflowDocumentStore.checksum : void 0;
			await workflowsStore.deactivateWorkflow(workflowId, expectedChecksum);
			workflowDocumentStore.setActiveState({
				activeVersionId: null,
				activeVersion: null
			});
			useExternalHooks().run("workflow.unpublished", { workflowId });
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText("workflowActivator.showError.title", { interpolate: { newStateName: "deactivated" } }) + ":");
			return false;
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};
	return {
		updatingWorkflowActivation,
		publishWorkflow,
		unpublishWorkflowFromHistory
	};
}
//#endregion
export { useWorkflowActivate as t };
