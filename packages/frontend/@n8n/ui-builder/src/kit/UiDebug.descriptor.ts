import type { UiComponentDef } from '../core/types';
import UiDebug from './UiDebug.vue';

export const DEBUG_DEF: UiComponentDef = {
	type: 'debug',
	group: 'Logic',
	label: 'Debug',
	component: UiDebug,
	props: [
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '={{ $state }}',
		},
	],
};
