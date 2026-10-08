/** The id of the "New workflow" item that only Simple mode adds to the composer + menu. */
export const ADD_WORKFLOW_ITEM_ID = 'add-workflow';

/**
 * The existing + menu items that Simple mode keeps, in this order: "Attach files",
 * "Connect local computer" and "Connect browser". Simple mode hides MCP tools,
 * connectors and preferences.
 */
export const SIMPLE_MENU_ITEM_IDS = ['attach-files', 'computer', 'browser'] as const;

type MenuItemLike = { id: string; data?: { status?: string } };

/**
 * Gives the Simple-mode + menu: the kept items that `items` holds, in the fixed order,
 * then `addWorkflowItem`. An item that is not available (for example the computer item
 * when computer use is off) stays out. The items are the same objects, unchanged.
 */
export function simpleMenuItems<T extends MenuItemLike>(
	items: readonly T[],
	addWorkflowItem: T,
): T[] {
	const kept = SIMPLE_MENU_ITEM_IDS.flatMap((id) => {
		const item = items.find((candidate) => candidate.id === id);
		return item ? [item] : [];
	});
	return [...kept, addWorkflowItem];
}

/**
 * Counts the top-level items whose connection is lost. The + button shows this count,
 * so in Simple mode it must count only the items that the menu shows.
 */
export function countDisconnectedItems(items: readonly MenuItemLike[]): number {
	return items.filter((item) => item.data?.status === 'disconnected').length;
}
