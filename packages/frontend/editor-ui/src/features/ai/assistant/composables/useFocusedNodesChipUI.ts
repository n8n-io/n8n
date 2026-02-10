import { computed } from 'vue';
import { useFocusedNodesStore } from '../focusedNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

/** Threshold at which individual chips are bundled into a single count chip */
export const CHIP_BUNDLE_THRESHOLD = 4;

/**
 * Shared logic for focused nodes chip UI used by both
 * ChatInputWithMention and FocusedNodesChips components.
 */
export function useFocusedNodesChipUI() {
	const focusedNodesStore = useFocusedNodesStore();
	const nodeTypesStore = useNodeTypesStore();

	const confirmedNodes = computed(() => focusedNodesStore.confirmedNodes);
	const unconfirmedNodes = computed(() => focusedNodesStore.filteredUnconfirmedNodes);
	const confirmedCount = computed(() => confirmedNodes.value.length);
	const unconfirmedCount = computed(() => unconfirmedNodes.value.length);

	const shouldBundleConfirmed = computed(() => confirmedCount.value >= CHIP_BUNDLE_THRESHOLD);
	const shouldBundleUnconfirmed = computed(() => unconfirmedCount.value >= CHIP_BUNDLE_THRESHOLD);

	const individualConfirmedNodes = computed(() =>
		confirmedCount.value >= 1 && confirmedCount.value < CHIP_BUNDLE_THRESHOLD
			? confirmedNodes.value
			: [],
	);

	const individualUnconfirmedNodes = computed(() =>
		unconfirmedCount.value >= 1 && unconfirmedCount.value < CHIP_BUNDLE_THRESHOLD
			? unconfirmedNodes.value
			: [],
	);

	function getNodeType(nodeTypeName: string) {
		return nodeTypesStore.getNodeType(nodeTypeName);
	}

	function handleChipClick(nodeId: string) {
		const node = focusedNodesStore.focusedNodesMap[nodeId];
		if (node?.state === 'confirmed') {
			canvasEventBus.emit('nodes:select', { ids: [nodeId], panIntoView: true });
		} else {
			const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
			focusedNodesStore.toggleNode(nodeId, isSelectedOnCanvas);
		}
	}

	function handleRemove(nodeId: string) {
		const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
		if (isSelectedOnCanvas) {
			focusedNodesStore.setState(nodeId, 'unconfirmed');
		} else {
			focusedNodesStore.removeNode(nodeId);
		}
	}

	return {
		confirmedNodes,
		unconfirmedNodes,
		confirmedCount,
		unconfirmedCount,
		shouldBundleConfirmed,
		shouldBundleUnconfirmed,
		individualConfirmedNodes,
		individualUnconfirmedNodes,
		getNodeType,
		handleChipClick,
		handleRemove,
	};
}
