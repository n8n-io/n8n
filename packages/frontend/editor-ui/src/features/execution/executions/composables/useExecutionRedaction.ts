import { computed, h } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	getActiveExecutionDataStore,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { MODAL_CONFIRM } from '@/app/constants/modals';
import RevealDataWarning from '../components/RevealDataWarning.vue';

export function useExecutionRedaction() {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = useWorkflowDocumentStore(
		createWorkflowDocumentId(workflowsStore.workflowId),
	);
	const message = useMessage();
	const telemetry = useTelemetry();
	const { showError } = useToast();
	const i18n = useI18n();

	const executionDataStore = computed(() => getActiveExecutionDataStore(workflowDocumentStore));
	const redactionInfo = computed(() => executionDataStore.value?.execution?.data?.redactionInfo);

	const isRedacted = computed(() => redactionInfo.value?.isRedacted === true);

	const canReveal = computed(() => redactionInfo.value?.canReveal === true);

	const isDynamicCredentials = computed(
		() => redactionInfo.value?.reason === 'dynamic_credentials',
	);

	async function revealData() {
		telemetry.track('User clicked reveal data', {
			workflow_id: workflowsStore.workflowId,
			execution_id: executionDataStore.value?.execution?.id,
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

		const executionId = executionDataStore.value?.execution?.id;
		if (!executionId) return;

		try {
			const revealed = await workflowsStore.fetchExecutionDataById(executionId, {
				redactExecutionData: false,
			});
			if (revealed?.data) {
				useExecutionDataStore(executionId).setExecutionRunData(revealed.data);
			}
		} catch (error) {
			showError(error, i18n.baseText('ndv.redacted.revealError'));
		}
	}

	return { isRedacted, canReveal, isDynamicCredentials, revealData };
}
