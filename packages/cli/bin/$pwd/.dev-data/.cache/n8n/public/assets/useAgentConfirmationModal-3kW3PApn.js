import { Jg as useUIStore, Zm as AGENT_CONFIRMATION_MODAL_KEY, dx as MODAL_CONFIRM, lx as MODAL_CANCEL, ux as MODAL_CLOSE } from "./app-D5flEmb-.js";
//#region src/features/agents/composables/useAgentConfirmationModal.ts
function useAgentConfirmationModal() {
	const uiStore = useUIStore();
	async function openAgentConfirmationModal(options) {
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
					}
				}
			});
		});
	}
	return { openAgentConfirmationModal };
}
//#endregion
export { useAgentConfirmationModal as t };
