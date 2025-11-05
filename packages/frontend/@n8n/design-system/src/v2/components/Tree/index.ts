import type { TreeRootProps, TreeRootEmits, TreeItemProps } from 'reka-ui';

import type { IMenuItem } from '@n8n/design-system/types/menu';

export type N8nTreeProps = Omit<TreeRootProps<IMenuItem>, 'getKey'> & {
	/**
	 * Tree data structure using IMenuItem type
	 */
	items: IMenuItem[];
	/**
	 * Estimated height of each tree item (in px) - used for virtualization
	 */
	estimateSize?: number;
	/**
	 * Optional function to get unique key from each item - defaults to item.id
	 */
	getKey?: (item: IMenuItem) => string;
};

export type N8nTreeEmits = TreeRootEmits;

export type N8nTreeItemProps = TreeItemProps<IMenuItem>;

export { default as Tree } from './Tree.vue';
