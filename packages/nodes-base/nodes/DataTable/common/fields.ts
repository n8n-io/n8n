import type { INodeProperties } from 'n8n-workflow';

export const DATA_TABLE_ID_FIELD = 'dataTableId';

export const DRY_RUN = {
	displayName: 'Dry Run',
	name: 'dryRun',
	type: 'boolean',
	default: false,
	description:
		'Whether the operation simulates and returns affected rows in their "before" and "after" states',
} satisfies INodeProperties;

export const DATA_TABLE_RESOURCE_LOCATOR_BASE = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
	displayName: 'Data table',
	name: DATA_TABLE_ID_FIELD,
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	builderHint: { message: "Default to mode: 'list' which is easier for users to set up" },
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'tableSearch',
				searchable: true,
			},
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. My Table',
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
} as const satisfies Omit<INodeProperties, 'displayOptions'>;
