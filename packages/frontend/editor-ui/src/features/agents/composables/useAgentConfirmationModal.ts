import { useUIStore } from '@/app/stores/ui.store';
import {
	AGENT_CONFIRMATION_MODAL_KEY,
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRM,
} from '@/app/constants';
import type { AgentConfirmationModalData } from '../components/AgentConfirmationModal.vue';

type AgentConfirmationModalResult = typeof MODAL_CONFIRM | typeof MODAL_CANCEL | typeof MODAL_CLOSE;

type AgentConfirmationModalOptions = Omit<
	AgentConfirmationModalData,
	'onConfirm' | 'onCancel' | 'onClose'
>;

export function useAgentConfirmationModal() {
	const uiStore = useUIStore();

	async function openAgentConfirmationModal(
		options: AgentConfirmationModalOptions,
	): Promise<AgentConfirmationModalResult> {
		return await new Promise((resolve) => {
			uiStore.openModalWithData({
				name: AGENT_CONFIRMATION_MODAL_KEY,
				data: {
					...options,
					onConfirm: () => {
						resolve(MODAL_CONFIRM);
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
