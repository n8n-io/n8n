import { INodeProperties } from 'n8n-workflow';
import { mapWith, showFor } from "./utils";
import * as shared from './shared';

const displayOpts = showFor(['organization'])

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['create', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
}

const organizationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	displayOptions: displayFor.resource.displayOptions,
	noDataExpression: true,
	default: 'find',
	options: [
		{
			name: 'Create',
			value: 'create',
			action: 'Create an organization',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete an organization',
		},
		{
			name: 'Find',
			value: 'find',
			action: 'Find an organization',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update an organization',
		},
	],
};

const idField: INodeProperties = {
	displayName: 'ID',
	name: 'id',
	description: 'The ID of the organization',
	type: 'string',
	required: true,
	default: ''
}

const organizationFields: INodeProperties[] = [
	Object.assign({}, idField, displayFor.id),
	...shared.organizationFields.map(mapWith(displayFor.createOrUpdate))
];

export {
	organizationOperations,
	organizationFields,
}
