import type { XYPosition } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import { computed, ref, watch } from 'vue';
import { getMousePosition } from '@/app/utils/nodeViewUtils';
import { useContextMenuItems, type ContextMenuAction } from './useContextMenuItems';
import { getEmptyGroupAnchor } from 'n8n-workflow';
import { isPresent } from '@/app/utils/typesUtils';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export type ContextMenuTarget = {
	readOnly?: boolean;
} & (
	| { source: 'canvas'; nodeIds: string[]; nodeId?: string }
	| { source: 'node-right-click'; nodeId: string }
	| { source: 'node-button'; nodeId: string }
	| { source: 'group'; groupId: string; nodeIds: string[] }
);
export type ContextMenuActionCallback = (
	action: ContextMenuAction,
	nodeIds: string[],
	groupId?: string,
) => void;

const position = ref<XYPosition>([0, 0]);
const target = ref<ContextMenuTarget>();

/** Identifies what a target points at, to detect re-invocations on the same element */
function getTargetEntityId(menuTarget: ContextMenuTarget): string | undefined {
	return menuTarget.source === 'group' ? menuTarget.groupId : menuTarget.nodeId;
}

export const useContextMenu = () => {
	const uiStore = useUIStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const isOpen = computed(() => target.value !== undefined);

	const targetNodeIds = computed(() => {
		if (!target.value) return [];

		const currentTarget = target.value;
		if (currentTarget.source !== 'group') {
			return currentTarget.source === 'canvas' ? currentTarget.nodeIds : [currentTarget.nodeId];
		}

		const group = workflowDocumentStore?.value?.getGroupById(currentTarget.groupId);
		if (!group) return currentTarget.nodeIds;

		const currentMemberNodes = group.nodeIds
			.map((nodeId) => workflowDocumentStore?.value?.getNodeById(nodeId))
			.filter(isPresent);
		const anchor = getEmptyGroupAnchor(group, currentMemberNodes);

		return anchor ? [anchor.id] : currentTarget.nodeIds;
	});

	const targetGroupId = computed(() =>
		target.value?.source === 'group' ? target.value.groupId : undefined,
	);

	const targetReadOnly = computed(() => target.value?.readOnly ?? false);

	const close = () => {
		target.value = undefined;
		position.value = [0, 0];
	};

	const open = (event: MouseEvent, menuTarget: ContextMenuTarget) => {
		event.stopPropagation();

		if (
			target.value !== undefined &&
			menuTarget.source === target.value.source &&
			getTargetEntityId(menuTarget) === getTargetEntityId(target.value)
		) {
			// Close context menu, let browser open native context menu
			close();
			return;
		}

		event.preventDefault();

		target.value = menuTarget;
		position.value = getMousePosition(event);
	};

	const actions = useContextMenuItems(targetNodeIds, targetGroupId, targetReadOnly);

	watch(() => uiStore.nodeViewOffsetPosition, close);

	return {
		isOpen,
		position,
		target,
		actions: computed(() => (isOpen.value ? actions.value : [])),
		targetNodeIds,
		targetGroupId,
		open,
		close,
	};
};
