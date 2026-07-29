import type { TabOptions } from '../../types';

export interface TabsProps<Value extends string | number> {
	modelValue?: Value;
	options?: Array<TabOptions<Value>>;
	size?: 'small' | 'medium';
	variant?: 'modern' | 'legacy';
}
