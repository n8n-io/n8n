import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_VERSION_METADATA_MODAL_KEY } from '../constants';
import type { AgentVersionMetadataModalData } from '../components/AgentVersionMetadataModal.vue';

export function useAgentVersionMetadataModal() {
	const uiStore = useUIStore();

	async function openVersionMetadata(
		options: Omit<AgentVersionMetadataModalData, 'onClose'>,
	): Promise<boolean> {
		return await new Promise((resolve) => {
			uiStore.openModalWithData({
				name: AGENT_VERSION_METADATA_MODAL_KEY,
				data: { ...options, onClose: resolve } satisfies AgentVersionMetadataModalData,
			});
		});
	}
	return { openVersionMetadata };
}
