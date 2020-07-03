import {
	INodeProperties,
 } from 'n8n-workflow';

export const fileOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy a file',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
			},
		],
		default: 'upload',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const fileFields = [

/* -------------------------------------------------------------------------- */
/*                                 file:copy                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'File ID',
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'The ID of folder to copy the file to. If not defined will be copied to the root folder',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'An optional new name for the copied file.',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description: 'An optional ID of the specific file version to copy.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 file:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'Field ID',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:download                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'File ID',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'download'
				],
				resource: [
					'file',
				],
			},
		},
		description: 'Name of the binary property to which to<br />write the data of the read file.',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'Field ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 file:upload                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		placeholder: 'photo.png',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The name the file should be saved as.',
	},
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'If the data to upload should be taken from binary field.',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				binaryData: [
					false,
				],
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},

		},
		placeholder: '',
		description: 'The text content of the file.',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				binaryData: [
					true,
				],
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},

		},
		placeholder: '',
		description: 'Name of the binary property which contains<br />the data for the file.',
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'ID of the parent folder that will contain the file. If not it will be uploaded to the root folder',
	},
] as INodeProperties[];
