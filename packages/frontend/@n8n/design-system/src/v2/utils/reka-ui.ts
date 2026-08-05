/**
 * Type-only re-exports from reka-ui for Combobox *.types.ts.
 *
 * vue-docgen-api resolves bare `from 'reka-ui'` to a cwd-relative path
 * (`../../node_modules/reka-ui/dist/index.js`) that does not exist when
 * Storybook's cwd is `packages/frontend/@n8n/storybook`. Point at the
 * package file with a path relative to *this* file so resolution stays
 * absolute to the design-system tree.
 */
export type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from '../../../node_modules/reka-ui/dist/index.d.ts';
