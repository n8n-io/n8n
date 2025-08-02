import type { INodeProperties } from 'n8n-workflow';

import { getId, mapWith, showFor } from './utils';
import { notePresend } from '../GenericFunctions';

const displayOpts = showFor(['note']);

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['create', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
};

const noteOperations: INodeProperties = {
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
			description: 'Create a note',
			action: 'Create a note',
			routing: {
				send: { preSend: [notePresend] },
				request: {
					method: 'POST',
					url: '/note',
				},
			},
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a note',
			action: 'Delete a note',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/note',
				},
			},
		},
		{
			name: 'Find',
			value: 'find',
			description: 'Find a note',
			action: 'Find a note',
			routing: {
				request: {
					method: 'GET',
					url: '=/note/{{$parameter["id"]}}',
				},
			},
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update a note',
			action: 'Update a note',
			routing: {
				send: { preSend: [notePresend] },
				request: {
					method: 'PUT',
					url: '=/note/{{$parameter["id"]}}',
				},
			},
		},
	],
};

const commonFields: INodeProperties[] = [
	{
		displayName: 'Body',
		name: 'body',
		description: 'The body of the note',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
	},
];

const noteFields: INodeProperties[] = [
	Object.assign(getId(), { description: 'The ID of the note' }, displayFor.id),
	...commonFields.map(mapWith(displayFor.createOrUpdate)),
];

export { noteOperations, noteFields };
