/**
 * Type-only re-exports from reka-ui for component *.types.ts files.
 *
 * vue-docgen-api resolves `from 'reka-ui'` to a broken relative JS path when
 * parsing some components in Storybook. Import types through this shim instead.
 */
export type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from '../../../node_modules/reka-ui/dist/index.d.ts';
