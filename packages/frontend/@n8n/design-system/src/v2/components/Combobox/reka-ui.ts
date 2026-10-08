/**
 * Local re-export shim for reka-ui.
 *
 * Combobox.vue and ComboboxItem.vue import reka-ui through this shim.
 * Storybook's vue-docgen-plugin resolves package imports from this folder to a
 * broken relative path:
 *
 *   src/v2/components/Combobox/ → ../../node_modules/reka-ui/dist/index.js
 *   (resolves to src/v2/node_modules/…, which does not exist)
 *
 * Values and types are re-exported here so files in this folder never
 * import 'reka-ui' directly.
 */
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
	ComboboxTrigger,
	ComboboxViewport,
	useForwardPropsEmits,
} from 'reka-ui';

export type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from 'reka-ui';
