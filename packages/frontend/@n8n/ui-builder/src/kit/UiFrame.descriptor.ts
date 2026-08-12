import { DEFAULT_REGION, ROUTE_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiFrame from './UiFrame.vue';

export const FRAME_DEF: UiComponentDef = {
	type: 'frame',
	group: 'Layout',
	label: 'App',
	icon: 'layout-template',
	component: UiFrame,
	// The content region holds pages and shows one; the other two stay on
	// screen across every route.
	regions: [
		{ name: 'header', label: 'Header', icon: 'menu' },
		{ name: DEFAULT_REGION, label: 'Pages', icon: 'files' },
		{ name: 'footer', label: 'Footer', icon: 'info' },
	],
	pagedRegion: DEFAULT_REGION,
	props: [
		{
			displayName: 'Default Page',
			name: 'defaultPage',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: ROUTE_PROP_TYPE as any,
			default: '',
			description: 'Where an app opens, and where an unknown route lands',
		},
	],
};
