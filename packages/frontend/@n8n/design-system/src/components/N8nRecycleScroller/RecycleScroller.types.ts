import type { ItemWithKey } from '../../types';

export interface RecycleScrollerProps<Key extends string, Item extends ItemWithKey<Key>> {
	itemSize: number;
	items: Item[];
	itemKey: Key;
	offset?: number;
}
