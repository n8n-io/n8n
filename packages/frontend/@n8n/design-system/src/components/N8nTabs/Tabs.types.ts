import type { TabOptions } from '../../types';

export type {
	TabsContentProps as N8nTabsContentProps,
	TabsIndicatorProps as N8nTabsIndicatorProps,
	TabsListProps as N8nTabsListProps,
	TabsRootEmits as N8nTabsRootEmits,
	TabsRootProps as N8nTabsRootProps,
	TabsTriggerProps as N8nTabsTriggerProps,
} from './reka-ui';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface TabsProps<Value extends string | number = string | number> {
	/**
	 * The selected tab. Bind it with `v-model`.
	 * The parent value stays in place until the parent accepts the update.
	 */
	modelValue?: Value;
	/**
	 * The selected tab on first render when `modelValue` is omitted.
	 * The tabs keep later changes.
	 */
	defaultValue?: Value;
	/**
	 * The tabs to render. Callers can narrow `Value` outside the component.
	 * @default []
	 */
	options?: Array<TabOptions<Value>>;
	/**
	 * These sizes align with the UI sizes of Select and Input.
	 * @default 'medium'
	 */
	size?: 'small' | 'medium' | 'large';
	/**
	 * Spread the tabs over the full width in equal slots. Keeps every tab in
	 * place when a label changes width, at the cost of truncating long ones.
	 * @default false
	 */
	justified?: boolean;
	/**
	 * Determines the layout and the arrow keys for keyboard navigation.
	 * @default 'horizontal'
	 */
	orientation?: 'horizontal' | 'vertical';
	/**
	 * Visual style. `underline` marks the active tab with a bar, `filled` with a background.
	 * @default 'underline'
	 */
	variant?: 'underline' | 'filled';
	/**
	 * Show container border (Bottom when horizontal. Left when vertical. ).
	 * Many consumers add this themselves so is optional.
	 * @default false
	 */
	showBorder?: boolean;
}
