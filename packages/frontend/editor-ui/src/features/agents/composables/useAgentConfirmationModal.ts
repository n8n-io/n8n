import { useUIStore } from '@/app/stores/ui.store';
import { MODAL_CANCEL, MODAL_CLOSE, MODAL_CONFIRM } from '@/app/constants';
import { AGENT_CONFIRMATION_MODAL_KEY } from '../constants';
import type { AgentConfirmationModalData } from '../components/AgentConfirmationModal.vue';

type AgentConfirmationModalResult = typeof MODAL_CONFIRM | typeof MODAL_CANCEL | typeof MODAL_CLOSE;

type AgentConfirmationModalOptions = Omit<AgentConfirmationModalData, 'onCancel' | 'onClose'>;

export function useAgentConfirmationModal() {
	const uiStore = useUIStore();

	/**
	 * Resolves once the user confirms, cancels, or closes. With `onConfirm` the
	 * modal stays open, and the promise pending, until that action succeeds.
	 */
	async function openAgentConfirmationModal(
		options: AgentConfirmationModalOptions,
	): Promise<AgentConfirmationModalResult> {
		return await new Promise((resolve) => {
			uiStore.openModalWithData({
				name: AGENT_CONFIRMATION_MODAL_KEY,
				data: {
					...options,
					onConfirm: async () => {
						const failure = await options.onConfirm?.();
						if (failure) return failure;
						resolve(MODAL_CONFIRM);
						return undefined;
					},
					onCancel: () => {
						resolve(MODAL_CANCEL);
					},
					onClose: () => {
						resolve(MODAL_CLOSE);
					},
				},
			});
		});
	}

	return { openAgentConfirmationModal };
}
