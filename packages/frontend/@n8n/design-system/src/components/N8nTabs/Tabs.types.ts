import type { TabOptions } from '../../types';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface TabsProps<Value extends string | number = string | number> {
	modelValue?: Value;
	options?: Array<TabOptions<Value>>;
	size?: 'small' | 'medium';
	variant?: 'modern' | 'legacy';
}
