import type { ContextMenuId, ContextMenuNode, ContextMenuRadioGroup } from './ContextMenu.types';

export function findRadioGroup<T extends ContextMenuId>(
	nodes: Array<ContextMenuNode<T>>,
	groupId: T,
): ContextMenuRadioGroup<T> | undefined {
	for (const node of nodes) {
		if (node.type === 'radio-group' && node.id === groupId) {
			return node;
		}
		if (node.type === 'group' || node.type === 'submenu') {
			const found = findRadioGroup(node.children, groupId);
			if (found) return found;
		}
	}
	return undefined;
}

export function applyRadioSelection<T extends ContextMenuId>(
	selected: T[],
	radioIdsInGroup: T[],
	radioId: T,
): T[] {
	return [...selected.filter((id) => !radioIdsInGroup.includes(id)), radioId];
}

export function applyCheckboxToggle<T extends ContextMenuId>(selected: T[], id: T): T[] {
	return selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
}

export function radioGroupValue<T extends ContextMenuId>(
	group: ContextMenuRadioGroup<T>,
	selected: readonly string[],
): T | undefined {
	return group.children.find((radio) => selected.includes(radio.id))?.id;
}
