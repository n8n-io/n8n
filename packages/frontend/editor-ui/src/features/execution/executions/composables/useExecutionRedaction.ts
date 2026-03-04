import { computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { MODAL_CONFIRM } from '@/app/constants/modals';

export function useExecutionRedaction() {
	const workflowsStore = useWorkflowsStore();
	const message = useMessage();
	const { showError } = useToast();
	const i18n = useI18n();

	const redactionInfo = computed(() => workflowsStore.getWorkflowExecution?.data?.redactionInfo);

	const isRedacted = computed(() => redactionInfo.value?.isRedacted === true);

	const canReveal = computed(() => redactionInfo.value?.canReveal === true);

	const isDynamicCredentials = computed(
		() => redactionInfo.value?.reason === 'dynamic_credentials',
	);

	async function revealData() {
		const warningHtml = [
			`<p>${i18n.baseText('ndv.redacted.revealModal.warning')}</p>`,
			'<ul style="text-align: left; margin-top: 8px;">',
			`<li>${i18n.baseText('ndv.redacted.revealModal.logged')}</li>`,
			`<li>${i18n.baseText('ndv.redacted.revealModal.legitimate')}</li>`,
			`<li>${i18n.baseText('ndv.redacted.revealModal.policy')}</li>`,
			'</ul>',
		].join('');

		const confirmed = await message.confirm(
			warningHtml,
			i18n.baseText('ndv.redacted.revealModal.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('ndv.redacted.revealModal.confirmButton'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) return;

		const executionId = workflowsStore.getWorkflowExecution?.id;
		if (!executionId) return;

		try {
			const revealed = await workflowsStore.fetchExecutionDataById(executionId, {
				redactExecutionData: false,
			});
			if (revealed?.data) {
				workflowsStore.setWorkflowExecutionRunData(revealed.data);
			}
		} catch (error) {
			showError(error, i18n.baseText('ndv.redacted.revealError'));
		}
	}

	return { isRedacted, canReveal, isDynamicCredentials, revealData };
}
