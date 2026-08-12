import type { UiComponentDef } from '../core/types';
import UiHeading from './UiHeading.vue';

export const HEADING_DEF: UiComponentDef = {
	type: 'heading',
	group: 'Display',
	label: 'Heading',
	component: UiHeading,
	props: [
		{ displayName: 'Text', name: 'text', type: 'string', default: 'Heading' },
		{
			displayName: 'Level',
			name: 'level',
			type: 'options',
			default: 2,
			options: [
				{ name: '1', value: 1 },
				{ name: '2', value: 2 },
				{ name: '3', value: 3 },
			],
		},
	],
};
