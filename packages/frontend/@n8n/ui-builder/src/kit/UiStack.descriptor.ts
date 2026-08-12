import type { UiComponentDef } from '../core/types';
import UiStack from './UiStack.vue';
import { CHILDREN } from './shared';

export const STACK_DEF: UiComponentDef = {
	type: 'stack',
	group: 'Layout',
	label: 'Stack',
	component: UiStack,
	regions: CHILDREN,
	props: [
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
		{ displayName: 'Gap', name: 'gap', type: 'number', default: 12 },
	],
};
