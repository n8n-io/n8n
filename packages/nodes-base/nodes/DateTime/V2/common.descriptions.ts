import type { INodeProperties } from 'n8n-workflow';

export const includeInputFields: INodeProperties = {
	displayName: 'Include input fields',
	name: 'includeInputFields',
	type: 'boolean',
	default: false,
	description: 'Whether to include all fields of the input item in the output item',
};
