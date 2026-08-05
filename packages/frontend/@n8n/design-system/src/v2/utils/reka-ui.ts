/**
 * Type-only re-exports from reka-ui for component *.types.ts files.
 *
 * vue-docgen-api resolves `from 'reka-ui'` to a broken relative JS path when
 * parsing some components in Storybook. Import types through this shim instead
 * (same bare-specifier pattern as RadioGroup/reka-ui.ts and TagsInput/reka-ui.ts).
 */
export type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from 'reka-ui';
