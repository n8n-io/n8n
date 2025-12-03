import type { INodeProperties } from 'n8n-workflow';

export const editorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['editor'],
			},
		},
		options: [
			{
				name: 'Create File',
				value: 'create',
				description: 'Create a new file',
				action: 'Create a new file',
			},
			{
				name: 'Insert Text',
				value: 'insert',
				description: 'Insert text at a specific line',
				action: 'Insert text at line',
			},
			{
				name: 'Replace Text',
				value: 'str_replace',
				description: 'Find and replace text in a file',
				action: 'Replace text in file',
			},
			{
				name: 'Undo Edit',
				value: 'undo_edit',
				description: 'Undo the last edit to a file',
				action: 'Undo last edit',
			},
			{
				name: 'View File',
				value: 'view',
				description: 'View the contents of a file',
				action: 'View file contents',
			},
		],
		default: 'view',
	},
];

export const editorFields: INodeProperties[] = [
	// Path field (required for all operations)
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/absolute/path/to/file.txt',
		description: 'The absolute path to the file',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['view', 'create', 'str_replace', 'insert', 'undo_edit'],
			},
		},
	},

	// View range for view operation
	{
		displayName: 'View Range',
		name: 'viewRange',
		type: 'fixedCollection',
		default: {},
		description: 'Optional line range to view (leave empty to view entire file)',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['view'],
			},
		},
		options: [
			{
				displayName: 'Range',
				name: 'range',
				values: [
					{
						displayName: 'Start Line',
						name: 'startLine',
						type: 'number',
						default: 1,
						description: 'The starting line number (1-indexed)',
					},
					{
						displayName: 'End Line',
						name: 'endLine',
						type: 'number',
						default: 100,
						description: 'The ending line number (1-indexed)',
					},
				],
			},
		],
	},

	// File content for create operation
	{
		displayName: 'File Content',
		name: 'fileText',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		required: true,
		default: '',
		description: 'The content to write to the new file',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['create'],
			},
		},
	},

	// Find/replace fields for str_replace operation
	{
		displayName: 'Find Text',
		name: 'oldStr',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		description: 'The text to find (must match exactly, including whitespace)',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['str_replace'],
			},
		},
	},
	{
		displayName: 'Replace With',
		name: 'newStr',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		description: 'The text to replace with',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['str_replace'],
			},
		},
	},

	// Insert fields
	{
		displayName: 'Line Number',
		name: 'insertLine',
		type: 'number',
		required: true,
		default: 1,
		description: 'The line number to insert text at (1-indexed)',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['insert'],
			},
		},
	},
	{
		displayName: 'Text to Insert',
		name: 'newStr',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		description: 'The text content to insert at the specified line',
		displayOptions: {
			show: {
				resource: ['editor'],
				operation: ['insert'],
			},
		},
	},
];
