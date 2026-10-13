import { computed, getCurrentScope, h, onScopeDispose, watch } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { MODAL_CONFIRM } from '@/app/constants/modals';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useUsersStore } from '@n8n/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import RevealDataWarning from '../components/RevealDataWarning.vue';

export function useExecutionRedaction() {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const message = useMessage();
	const telemetry = useTelemetry();
	const { showError } = useToast();
	const i18n = useI18n();
	const uiStore = useUIStore();
	const usersStore = useUsersStore();
	const credentialsStore = useCredentialsStore();

	const redactionInfo = computed(
		() => workflowExecutionStateStore.value.activeExecution?.data?.redactionInfo,
	);

	const isRedacted = computed(() => redactionInfo.value?.isRedacted === true);

	const canReveal = computed(() => redactionInfo.value?.canReveal === true);

	const isDynamicCredentials = computed(
		() => redactionInfo.value?.reason === 'dynamic_credentials',
	);

	/** The name a node of the execution stored for the credential. */
	function credentialName(credentialId: string): string {
		const nodes = workflowExecutionStateStore.value.activeExecution?.workflowData?.nodes ?? [];
		for (const node of nodes) {
			for (const credential of Object.values(node.credentials ?? {})) {
				if (credential.id === credentialId) return credential.name;
			}
		}
		return credentialsStore.getCredentialById(credentialId)?.name ?? '';
	}

	function canShareCredential(credentialId: string): boolean {
		if (getResourcePermissions(usersStore.currentUser?.globalScopes).credential?.share) {
			return true;
		}
		const scopes = credentialsStore.getCredentialById(credentialId)?.scopes;
		return getResourcePermissions(scopes).credential?.share === true;
	}

	/**
	 * A credential behind a `credential_inaccessible` redaction that the viewer
	 * can share, so they can give themselves access and see the data.
	 */
	const credentialToShare = computed(() => {
		if (redactionInfo.value?.reason !== 'credential_inaccessible') return undefined;

		const id = (redactionInfo.value.credentialIds ?? []).find(canShareCredential);
		return id ? { id, name: credentialName(id) } : undefined;
	});

	/** Fetches the execution again and writes it to its own data store, keyed by its id. */
	async function reloadExecutionData(executionId: string, query?: ExecutionRedactionQueryDto) {
		const execution = await workflowsStore.fetchExecutionDataById(executionId, query);
		if (execution?.data) {
			useExecutionDataStore(createExecutionDataId(executionId)).setExecutionRunData(execution.data);
		}
	}

	// The listeners below start from a click handler, outside any component scope,
	// so nothing stops them on unmount. Tie them to this composable's scope instead.
	let stopPendingReload: (() => void) | undefined;
	let disposed = false;
	if (getCurrentScope()) {
		onScopeDispose(() => {
			disposed = true;
			stopPendingReload?.();
		});
	}

	/**
	 * Reloads the execution when the credential modal closes after the sharing of
	 * the credential changed, so the panel shows the data the user can now see.
	 */
	function reloadAfterSharingChange(credentialId: string, executionId: string) {
		stopPendingReload?.();

		let sharingChanged = false;
		const stopListening = credentialsStore.$onAction(({ name, args, after }) => {
			if (name !== 'setCredentialSharedWith' || args[0].credentialId !== credentialId) return;
			after(() => {
				sharingChanged = true;
			});
		});
		// Open, not active: a modal on top makes it inactive while it stays open.
		const stopWatching = watch(
			() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true,
			(isOpen) => {
				if (isOpen) return;
				stop();
				if (!sharingChanged) return;
				reloadExecutionData(executionId).catch((error: unknown) => {
					// The panel this reload was for is gone, so there is nobody to tell.
					if (disposed) return;
					showError(error, i18n.baseText('ndv.redacted.reloadError'));
				});
			},
		);

		function stop() {
			stopListening();
			stopWatching();
			if (stopPendingReload === stop) stopPendingReload = undefined;
		}
		stopPendingReload = stop;
	}

	function openCredentialSharing() {
		if (!credentialToShare.value) return;
		const credentialId = credentialToShare.value.id;
		const executionId = workflowExecutionStateStore.value.activeExecution?.id;

		telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_OPENED_CREDENTIAL_SHARING_FROM_REDACTED_DATA, {
			credential_id: credentialId,
			workflow_id: workflowDocumentStore.value.workflowId,
			execution_id: executionId,
		});

		uiStore.openExistingCredential(credentialId, { initialTab: 'sharing' });
		if (executionId) reloadAfterSharingChange(credentialId, executionId);
	}

	async function revealData() {
		telemetry.track('User clicked reveal data', {
			workflow_id: workflowDocumentStore.value.workflowId,
			execution_id: workflowExecutionStateStore.value.activeExecution?.id,
		});

		const warningContent = h(RevealDataWarning, {
			warning: i18n.baseText('ndv.redacted.revealModal.warning'),
			logged: i18n.baseText('ndv.redacted.revealModal.logged'),
			legitimate: i18n.baseText('ndv.redacted.revealModal.legitimate'),
			policy: i18n.baseText('ndv.redacted.revealModal.policy'),
		});

		const confirmed = await message.confirm(
			warningContent,
			i18n.baseText('ndv.redacted.revealModal.title'),
			{
				confirmButtonText: i18n.baseText('ndv.redacted.revealModal.confirmButton'),
				showClose: true,
				customClass: 'reveal-redacted-data-modal',
			},
		);

		if (confirmed !== MODAL_CONFIRM) return;

		const executionId = workflowExecutionStateStore.value.activeExecution?.id;
		if (!executionId) return;

		try {
			// Keyed by the execution's id, so the update lands on the execution we
			// revealed regardless of which document scope we run under.
			await reloadExecutionData(executionId, { redactExecutionData: false });
		} catch (error) {
			showError(error, i18n.baseText('ndv.redacted.revealError'));
		}
	}

	return {
		isRedacted,
		canReveal,
		isDynamicCredentials,
		revealData,
		credentialToShare,
		openCredentialSharing,
	};
}
