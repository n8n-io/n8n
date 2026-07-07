/**
 * Local re-export shim for reka-ui.
 *
 * RadioGroup.vue and RadioGroupItem.vue import reka-ui through this shim.
 * Storybook's vue-docgen-plugin resolves package imports from this folder to a
 * broken relative path:
 *
 *   src/v2/components/RadioGroup/ → ../../../node_modules/reka-ui/dist/index.js
 *   (resolves to src/node_modules/…, which does not exist)
 *
 * AcceptableValue is defined inline because vue-docgen follows `export type {
 * … } from 'reka-ui'` re-exports and hits the same broken path. Runtime exports
 * and other types are re-exported here so .vue files in this folder never import
 * 'reka-ui' directly.
 */
export type AcceptableValue = string | number | bigint | Record<string, unknown> | null;

export {
	injectRadioGroupRootContext,
	Label,
	RadioGroupIndicator,
	RadioGroupItem,
	RadioGroupRoot,
	useForwardProps,
} from 'reka-ui';

export type { RadioGroupItemProps, RadioGroupRootProps } from 'reka-ui';
