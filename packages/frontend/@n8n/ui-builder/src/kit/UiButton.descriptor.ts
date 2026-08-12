import { ACTION_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiButton from './UiButton.vue';

export const BUTTON_DEF: UiComponentDef = {
	type: 'button',
	group: 'Input',
	label: 'Button',
	component: UiButton,
	// Shows the design system's loading state while its own chain is calling out.
	wantsBusyFlag: true,
	props: [
		{ displayName: 'Label', name: 'label', type: 'string', default: 'Button' },
		{
			displayName: 'Variant',
			name: 'variant',
			type: 'options',
			default: 'primary',
			options: [
				{ name: 'Primary', value: 'primary' },
				{ name: 'Secondary', value: 'secondary' },
				{ name: 'Tertiary', value: 'tertiary' },
			],
		},
		{ displayName: 'Disabled', name: 'disabled', type: 'boolean', default: false },
		// Usually an expression: `={{ $route.path === $item.path }}` inside a nav bar.
		{ displayName: 'Active', name: 'active', type: 'boolean', default: false },
		{
			displayName: 'On Click',
			name: 'onClick',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: ACTION_PROP_TYPE as any,
			default: [],
		},
	],
};
