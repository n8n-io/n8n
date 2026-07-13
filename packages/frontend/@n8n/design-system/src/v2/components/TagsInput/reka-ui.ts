/**
 * Local re-export shim for reka-ui.
 *
 * TagsInput.vue imports reka-ui through this shim. Storybook's vue-docgen-plugin
 * resolves package imports from this folder to a broken relative path:
 *
 *   src/v2/components/TagsInput/ → ../../../node_modules/reka-ui/dist/index.js
 *   (resolves to src/node_modules/…, which does not exist)
 *
 * Values and types are re-exported here so .vue files in this folder never
 * import 'reka-ui' directly.
 */
export {
	TagsInputInput,
	TagsInputItem,
	TagsInputItemDelete,
	TagsInputItemText,
	TagsInputRoot,
	useForwardPropsEmits,
} from 'reka-ui';

export type {
	AcceptableInputValue,
	TagsInputInputProps,
	TagsInputRootEmits,
	TagsInputRootProps,
} from 'reka-ui';
