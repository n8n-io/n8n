import type { INodeProperties } from 'n8n-workflow';

export const BOARD_ID_FIELD = 'boardId';

export const BOARD_RESOURCE_LOCATOR_BASE = {
	displayName: 'Board',
	name: BOARD_ID_FIELD,
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'boardSearch',
				searchable: true,
			},
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. My Board',
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
} as const satisfies Omit<INodeProperties, 'displayOptions'>;
