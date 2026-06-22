import { computed, h } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { MODAL_CONFIRM } from '@/app/constants/modals';
import RevealDataWarning from '../components/RevealDataWarning.vue';

export function useExecutionRedaction() {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const message = useMessage();
	const telemetry = useTelemetry();
	const { showError } = useToast();
	const i18n = useI18n();

	const redactionInfo = computed(
		() => workflowExecutionStateStore.value.activeExecution?.data?.redactionInfo,
	);

	const isRedacted = computed(() => redactionInfo.value?.isRedacted === true);

	const canReveal = computed(() => redactionInfo.value?.canReveal === true);

	const isDynamicCredentials = computed(
		() => redactionInfo.value?.reason === 'dynamic_credentials',
	);

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
			const revealed = await workflowsStore.fetchExecutionDataById(executionId, {
				redactExecutionData: false,
			});
			if (revealed?.data) {
				// Write to the per-execution data store directly (keyed by the
				// revealed execution's id) so the update lands on the execution we
				// revealed regardless of which document scope we run under.
				useExecutionDataStore(createExecutionDataId(executionId)).setExecutionRunData(
					revealed.data,
				);
			}
		} catch (error) {
			showError(error, i18n.baseText('ndv.redacted.revealError'));
		}
	}

	return { isRedacted, canReveal, isDynamicCredentials, revealData };
}
