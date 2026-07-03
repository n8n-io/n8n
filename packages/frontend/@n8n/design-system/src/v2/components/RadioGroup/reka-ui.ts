// Temporary shim for Storybook vue-docgen: importing 'reka-ui' from this folder
// resolves to a broken relative path. Re-export via a local module instead.
export {
	Label,
	RadioGroupIndicator,
	RadioGroupItem,
	RadioGroupRoot,
	useForwardPropsEmits,
} from 'reka-ui';

export type {
	RadioGroupItemProps,
	RadioGroupRootEmits,
	RadioGroupRootProps,
} from 'reka-ui';
