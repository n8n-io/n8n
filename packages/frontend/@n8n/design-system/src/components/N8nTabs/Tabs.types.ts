import type { TabOptions } from '../../types';

export type {
	TabsContentProps as N8nTabsContentProps,
	TabsListProps as N8nTabsListProps,
	TabsRootEmits as N8nTabsRootEmits,
	TabsRootProps as N8nTabsRootProps,
	TabsTriggerProps as N8nTabsTriggerProps,
} from './reka-ui';

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
