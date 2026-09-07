import type { ItemWithKey } from '../../types';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface RecycleScrollerProps<
	Key extends string = string,
	Item extends ItemWithKey<Key> = ItemWithKey<Key>,
> {
	itemSize: number;
	items: Item[];
	itemKey: Key;
	offset?: number;
}
