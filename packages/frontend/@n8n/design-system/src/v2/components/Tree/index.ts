import type { TreeRootProps, TreeRootEmits, TreeItemProps } from 'reka-ui';

import type { IMenuItem } from '@n8n/design-system/types/menu';

/**
 * Base interface that tree items must implement
 */
export interface TreeItem {
	/**
	 * Unique identifier for the tree item
	 */
	id: string;
	/**
	 * Optional children array for nested tree structure
	 */
	children?: TreeItem[];
}

export type N8nTreeProps<T extends TreeItem = IMenuItem> = Omit<TreeRootProps<T>, 'getKey'> & {
	/**
	 * Tree data structure using generic type T
	 */
	items: T[];
	/**
	 * Estimated height of each tree item (in px) - used for virtualization
	 */
	estimateSize?: number;
	/**
	 * Optional function to get unique key from each item - defaults to item.id
	 */
	getKey?: (item: T) => string;
};

export type N8nTreeEmits = TreeRootEmits;

export type N8nTreeItemProps<T extends TreeItem = IMenuItem> = TreeItemProps<T>;

export { default as Tree } from './Tree.vue';
