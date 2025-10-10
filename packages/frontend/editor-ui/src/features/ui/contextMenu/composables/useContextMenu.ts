import type { XYPosition } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { computed, ref, watch } from 'vue';
import { getMousePosition } from '@/utils/nodeViewUtils';
import { useContextMenuItems, type ContextMenuAction } from './useContextMenuItems';

export type ContextMenuTarget =
	| { source: 'canvas'; nodeIds: string[]; nodeId?: string }
	| { source: 'node-right-click'; nodeId: string }
	| { source: 'node-button'; nodeId: string };
export type ContextMenuActionCallback = (action: ContextMenuAction, nodeIds: string[]) => void;

const position = ref<XYPosition>([0, 0]);
const target = ref<ContextMenuTarget>();

export const useContextMenu = () => {
	const uiStore = useUIStore();
	const isOpen = computed(() => target.value !== undefined);

	const targetNodeIds = computed(() => {
		if (!target.value) return [];

		const currentTarget = target.value;
		return currentTarget.source === 'canvas' ? currentTarget.nodeIds : [currentTarget.nodeId];
	});

	const close = () => {
		target.value = undefined;
		position.value = [0, 0];
	};

	const open = (event: MouseEvent, menuTarget: ContextMenuTarget) => {
		event.stopPropagation();

		if (
			isOpen.value &&
			menuTarget.source === target.value?.source &&
			menuTarget.nodeId === target.value?.nodeId
		) {
			// Close context menu, let browser open native context menu
			close();
			return;
		}

		event.preventDefault();

		target.value = menuTarget;
		position.value = getMousePosition(event);
	};

	const actions = useContextMenuItems(targetNodeIds);

	watch(() => uiStore.nodeViewOffsetPosition, close);

	return {
		isOpen,
		position,
		target,
		actions: computed(() => (isOpen.value ? actions.value : [])),
		targetNodeIds,
		open,
		close,
	};
};
