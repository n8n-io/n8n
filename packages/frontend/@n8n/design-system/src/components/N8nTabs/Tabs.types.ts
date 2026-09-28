import type { TabOptions } from '../../types';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface TabsProps<Value extends string | number = string | number> {
	modelValue?: Value;
	options?: Array<TabOptions<Value>>;
	size?: 'small' | 'medium';
	variant?: 'modern' | 'legacy';
	/**
	 * Spread the tabs over the full width in equal slots. Keeps every tab in
	 * place when a label changes width, at the cost of truncating long ones.
	 */
	justified?: boolean;
}
