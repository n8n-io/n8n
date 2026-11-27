import { h } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants/modals';
import RevealDataWarning from '@/features/execution/executions/components/RevealDataWarning.vue';

/** Asks the reader to confirm a reveal of redacted data, with the same dialog as the executions view. */
export function useConfirmRevealData() {
	const i18n = useI18n();
	const message = useMessage();

	async function confirmReveal(): Promise<boolean> {
		const confirmed = await message.confirm(
			h(RevealDataWarning, {
				warning: i18n.baseText('ndv.redacted.revealModal.warning'),
				logged: i18n.baseText('ndv.redacted.revealModal.logged'),
				legitimate: i18n.baseText('ndv.redacted.revealModal.legitimate'),
				policy: i18n.baseText('ndv.redacted.revealModal.policy'),
			}),
			i18n.baseText('ndv.redacted.revealModal.title'),
			{
				confirmButtonText: i18n.baseText('ndv.redacted.revealModal.confirmButton'),
				showClose: true,
				customClass: 'reveal-redacted-data-modal',
			},
		);
		return confirmed === MODAL_CONFIRM;
	}

	return { confirmReveal };
}
