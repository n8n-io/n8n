/**
 * Local re-export shim for reka-ui.
 *
 * Combobox.vue and ComboboxItem.vue import reka-ui through this shim.
 * Storybook's vue-docgen-plugin resolves package imports from this folder to a
 * broken relative path:
 *
 *   src/v2/components/Combobox/ → ../../../node_modules/reka-ui/dist/index.js
 *   (resolves to src/node_modules/…, which does not exist)
 *
 * AcceptableValue is defined inline because vue-docgen follows `export type {
 * … } from 'reka-ui'` re-exports and hits the same broken path.
 */
export type AcceptableValue = string | number | bigint | Record<string, unknown> | null;

export {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxItemIndicator,
	ComboboxLabel,
	ComboboxPortal,
	ComboboxRoot,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxViewport,
	useForwardPropsEmits,
} from 'reka-ui';

export type {
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from 'reka-ui';
