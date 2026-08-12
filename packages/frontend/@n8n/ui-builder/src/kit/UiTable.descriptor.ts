import { ACTION_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiTable from './UiTable.vue';

export const TABLE_DEF: UiComponentDef = {
	type: 'table',
	group: 'Display',
	label: 'Table',
	component: UiTable,
	props: [
		{ displayName: 'Rows', name: 'rows', type: 'string', default: '={{ $state.rows }}' },
		{ displayName: 'Columns', name: 'columns', type: 'string', default: 'name' },
		{
			displayName: 'On Mount',
			name: 'onMount',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: ACTION_PROP_TYPE as any,
			default: [],
		},
	],
};
