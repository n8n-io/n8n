import { DEFAULT_REGION, ROUTE_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiShell from './UiShell.vue';

export const SHELL_DEF: UiComponentDef = {
	type: 'shell',
	group: 'Layout',
	label: 'Shell (pages)',
	component: UiShell,
	// The content region holds pages and shows one; the other two stay on
	// screen across every route.
	regions: [
		{ name: 'header', label: 'Header' },
		{ name: DEFAULT_REGION, label: 'Pages' },
		{ name: 'footer', label: 'Footer' },
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
