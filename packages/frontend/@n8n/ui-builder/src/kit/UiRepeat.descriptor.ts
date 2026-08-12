import type { UiComponentDef } from '../core/types';
import UiRepeat from './UiRepeat.vue';
import { CHILDREN } from './shared';

export const REPEAT_DEF: UiComponentDef = {
	type: 'repeat',
	label: 'Repeat',
	group: 'Logic',
	component: UiRepeat,
	regions: CHILDREN,
	// The children render once per element of `items`, with `$item` and
	// `$index` bound for them to read.
	repeatOver: 'items',
	props: [
		{
			displayName: 'Items',
			name: 'items',
			type: 'string',
			default: '={{ $state.orders }}',
		},
		{
			displayName: 'Direction',
			name: 'direction',
			type: 'options',
			default: 'vertical',
			options: [
				{ name: 'Vertical', value: 'vertical' },
				{ name: 'Horizontal', value: 'horizontal' },
			],
		},
		{ displayName: 'Gap', name: 'gap', type: 'number', default: 8 },
	],
};
