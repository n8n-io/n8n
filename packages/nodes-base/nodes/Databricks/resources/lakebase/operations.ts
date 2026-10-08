import type { INodeProperties } from 'n8n-workflow';

export const lakebaseOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['lakebase'],
		},
	},
	options: [
		{
			name: 'Delete',
			value: 'deleteRows',
			description: 'Delete the rows that match the conditions',
			action: 'Delete rows',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Get many rows from a table',
			action: 'Get many rows',
		},
		{
			name: 'Insert',
			value: 'insert',
			description: 'Insert a row into a table',
			action: 'Insert a row',
		},
		{
			// The table-node wording, as in the Postgres and Oracle SQL nodes. The rule
			// asks for "Create or Update", which does not sit beside "Insert" here.
			// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
			name: 'Insert or Update',
			value: 'upsert',
			// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-upsert
			description: 'Insert a row, or update it when a matching row is already there',
			action: 'Insert or update a row',
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update the rows that match a column',
			action: 'Update rows',
		},
	],
	default: 'getAll',
};
