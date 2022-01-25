import { INodeProperties } from 'n8n-workflow';

export const elementOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
			{
				name: 'Search',
				value: 'serach',
			},
		],
		displayOptions: {
			show: {
				content: ['elements'],
			},
		},
	},
] as INodeProperties[];

export const elementFields = [
	// ----------------------------------
	//       element: shared
	// ----------------------------------
	{
		displayName: 'Element ID',
		name: 'elementId',
		type: 'string',
		required: true,
		description: 'The identifier of the element.',
		default: '',
		placeholder: 'Element',
		displayOptions: {
			show: {
				content: ['elements'],
				operation: ['delete', 'get', 'update'],
			},
		},
	},

	// ----------------------------------
	//       element type: update, create
	// ----------------------------------
	{
		displayName: 'Element Type',
		name: 'elementType',
		type: 'options',
		default: ['canvas'],
		required: false,
		options: [
			{
				name: 'Browser',
				value: 'browser',
			},
			{
				name: 'Canvas',
				value: 'canvas',
			},
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Grid',
				value: 'grid',
			},
			{
				name: 'Image',
				value: 'image',
			},
			{
				name: 'Line',
				value: 'line',
			},
			{
				name: 'LinkedDocument',
				value: 'linkedDocument',
			},
			{
				name: 'LegacyNote',
				value: 'legacyNote',
			},
			{
				name: 'Selection',
				value: 'selection',
			},
			{
				name: 'Shape',
				value: 'shape',
			},
			{
				name: 'Stroke',
				value: 'stroke',
			},
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Video',
				value: 'video',
			},
			{
				name: 'Window',
				value: 'window',
			},
			{
				name: 'Whiteboard',
				value: 'whiteboard',
			},
		],
		displayOptions: {
			show: {
				content: ['elements'],
				operation: ['update', 'create'],
			},
		},
	},
] as INodeProperties[];

export interface ElementUpdateFields {
	groups: string[];
	externalId: string;
}
