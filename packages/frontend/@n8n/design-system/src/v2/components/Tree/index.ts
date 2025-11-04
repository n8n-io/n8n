import type { TreeRootProps, TreeRootEmits, TreeItemProps } from 'reka-ui';

import type { IMenuItem } from '@n8n/design-system/types/menu';

export type N8nTreeProps = TreeRootProps & {
	/**
	 * Tree data structure using IMenuItem type
	 */
	items?: IMenuItem[];
	/**
	 * Estimated height of each tree item (in px) - used for virtualization
	 */
	estimateSize?: number;
};

export type N8nTreeEmits = TreeRootEmits;

export type N8nTreeItemProps = TreeItemProps<IMenuItem>;

export { default as Tree } from './Tree.vue';
