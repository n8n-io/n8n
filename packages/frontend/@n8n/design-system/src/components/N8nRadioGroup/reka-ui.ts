/**
 * Local re-export shim for reka-ui.
 *
 * RadioGroup.vue and RadioGroupItem.vue import reka-ui through this shim.
 * Storybook's vue-docgen-plugin resolves package imports from this folder to a
 * broken relative path:
 *
 *   src/components/N8nRadioGroup/ → ../../../node_modules/reka-ui/dist/index.js
 *   (vue-docgen may resolve this incorrectly; keep imports behind this shim)
 *
 * Types are re-exported here so .vue files in this folder never import
 * 'reka-ui' directly.
 */
export {
	injectRadioGroupRootContext,
	Label,
	RadioGroupIndicator,
	RadioGroupItem,
	RadioGroupRoot,
	useForwardProps,
} from 'reka-ui';

export type { RadioGroupItemProps, RadioGroupRootProps } from 'reka-ui';
