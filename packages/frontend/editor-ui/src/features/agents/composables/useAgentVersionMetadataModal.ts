import { onScopeDispose, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_VERSION_METADATA_MODAL_KEY } from '../constants';
import type { AgentVersionMetadataModalData } from '../components/AgentVersionMetadataModal.vue';

export function useAgentVersionMetadataModal() {
	const uiStore = useUIStore();
	let cancelPending: (() => void) | undefined;
	let disposed = false;
	onScopeDispose(() => {
		disposed = true;
		cancelPending?.();
	}, true);

	async function openVersionMetadata({
		isCurrent = () => true,
		...options
	}: Omit<AgentVersionMetadataModalData, 'onClose'> & {
		isCurrent?: () => boolean;
	}): Promise<boolean> {
		if (disposed || !isCurrent()) return false;
		cancelPending?.();
		return await new Promise((resolve) => {
			let closed = false;
			const stopWatching = watch(
				isCurrent,
				(current) => {
					if (!current) cancelPending?.();
				},
				{ flush: 'sync' },
			);
			const finish = (saved: boolean) => {
				if (closed) return;
				closed = true;
				stopWatching();
				cancelPending = undefined;
				resolve(saved);
			};
			cancelPending = () => {
				uiStore.closeModal(AGENT_VERSION_METADATA_MODAL_KEY);
				finish(false);
			};
			uiStore.openModalWithData({
				name: AGENT_VERSION_METADATA_MODAL_KEY,
				data: {
					...options,
					onSubmit: async (metadata) => {
						if (closed || !isCurrent()) return false;
						const saved = await options.onSubmit(metadata);
						return !closed && saved;
					},
					onClose: finish,
				} satisfies AgentVersionMetadataModalData,
			});
		});
	}
	return { openVersionMetadata };
}
