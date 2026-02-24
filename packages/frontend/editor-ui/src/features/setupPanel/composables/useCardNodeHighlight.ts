import type { Ref } from 'vue';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';

/**
 * Shared hover-highlight logic for the "Used in X nodes" hint
 * shown in NodeSetupCard and CredentialTypeSetupCard.
 *
 * On mouseenter the hint highlights all related nodes;
 * on mouseleave it restores highlight to just the primary node.
 */
export function useCardNodeHighlight(primaryNodeId: Ref<string>, allNodeIds: Ref<string[]>) {
	const setupPanelStore = useSetupPanelStore();

	const onSharedNodesHintEnter = () => {
		setupPanelStore.setHighlightedNodes(allNodeIds.value);
	};

	const onSharedNodesHintLeave = () => {
		setupPanelStore.setHighlightedNodes([primaryNodeId.value]);
	};

	return { onSharedNodesHintEnter, onSharedNodesHintLeave };
}
