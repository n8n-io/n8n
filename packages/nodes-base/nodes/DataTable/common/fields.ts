import type { INodeProperties } from 'n8n-workflow';

export const DATA_TABLE_ID_FIELD = 'dataTableId';

export const DRY_RUN = {
	displayName: 'Dry Run',
	name: 'dryRun',
	type: 'boolean',
	default: false,
	description:
		'Whether the operation should only be simulated, returning the rows that would have been affected',
} satisfies INodeProperties;
