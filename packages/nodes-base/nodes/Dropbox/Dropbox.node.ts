import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	dropboxApiRequest
} from './GenericFunctions';

export class Dropbox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dropbox',
		name: 'dropbox',
		icon: 'file:dropbox.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Dropbox',
		defaults: {
			name: 'Dropbox',
			color: '#0062ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dropboxApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'dropboxOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'Means of authenticating with the service.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
				],
				default: 'file',
				description: 'The resource to operate on.',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
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
						name: 'Move',
						value: 'move',
						description: 'Move a file',
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

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'folder',
						],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a folder',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a folder',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Return the files and folders in a given folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a folder',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file/folder:copy
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'copy',
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/original.txt',
				description: 'The path of file or folder to copy.',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'copy',
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder.',
			},

			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'Delete Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description: 'The path to delete. Can be a single file or a whole folder.',
			},


			// ----------------------------------
			//         file/folder:move
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'move',
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/old_name.txt',
				description: 'The path of file or folder to move.',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'move',
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder.',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
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
				placeholder: '/invoices/2019/invoice_1.pdf',
				description: 'The file path of the file to download. Has to contain the full path.',
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
							'download',
						],
						resource: [
							'file',
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},

			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
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
				placeholder: '/invoices/2019/invoice_1.pdf',
				description: 'The file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.',
			},
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
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
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						resource: [
							'file',
						],
						binaryData: [
							false,
						],
					},

				},
				placeholder: '',
				description: 'The text content of the file to upload.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						resource: [
							'file',
						],
						binaryData: [
							true,
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file to be uploaded.',
			},



			// ----------------------------------
			//         folder
			// ----------------------------------

			// ----------------------------------
			//         folder:create
			// ----------------------------------
			{
				displayName: 'Folder',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'folder',
						],
					},
				},
				placeholder: '/invoices/2019',
				description: 'The folder to create. The parent folder has to exist.',
			},

			// ----------------------------------
			//         folder:list
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						resource: [
							'folder',
						],
					},
				},
				placeholder: '/invoices/2019/',
				description: 'The path of which to list the content.',
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];


		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';
		let body: IDataObject | Buffer;
		let options;
		const query: IDataObject = {};

		const headers: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			body = {};

			if (resource === 'file') {
				if (operation === 'download') {
					// ----------------------------------
					//         download
					// ----------------------------------

					requestMethod = 'POST';

					query.arg = JSON.stringify({
						path: this.getNodeParameter('path', i) as string,
					});

					endpoint = 'https://content.dropboxapi.com/2/files/download';

				} else if (operation === 'upload') {
					// ----------------------------------
					//         upload
					// ----------------------------------

					requestMethod = 'POST';
					headers['Content-Type'] = 'application/octet-stream';

					query.arg = JSON.stringify({
						mode: 'overwrite',
						path: this.getNodeParameter('path', i) as string,
					});

					endpoint = 'https://content.dropboxapi.com/2/files/upload';

					if (this.getNodeParameter('binaryData', i) === true) {

						options = { json: false };

						// Is binary file to upload
						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

						if (item.binary[propertyNameUpload] === undefined) {
							throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
						}

						body = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING);
					} else {
						// Is text file
						body = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
					}
				}

			} else if (resource === 'folder') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';
					body = {
						path: this.getNodeParameter('path', i) as string,
					};

					endpoint = 'https://api.dropboxapi.com/2/files/create_folder_v2';

				} else if (operation === 'list') {
					// ----------------------------------
					//         list
					// ----------------------------------

					requestMethod = 'POST';
					body = {
						path: this.getNodeParameter('path', i) as string,
						limit: 2000,
					};

					// TODO: If more files than the max-amount exist it has to be possible to
					//       also request them.

					endpoint = 'https://api.dropboxapi.com/2/files/list_folder';

				}
			}
			if (['file', 'folder'].includes(resource)) {
				if (operation === 'copy') {
					// ----------------------------------
					//         copy
					// ----------------------------------

					requestMethod = 'POST';
					body = {
						from_path: this.getNodeParameter('path', i) as string,
						to_path: this.getNodeParameter('toPath', i) as string,
					};

					endpoint = 'https://api.dropboxapi.com/2/files/copy_v2';

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'POST';
					body = {
						path: this.getNodeParameter('path', i) as string,
					};

					endpoint = 'https://api.dropboxapi.com/2/files/delete_v2';

				} else if (operation === 'move') {
					// ----------------------------------
					//         move
					// ----------------------------------

					requestMethod = 'POST';
					body = {
						from_path: this.getNodeParameter('path', i) as string,
						to_path: this.getNodeParameter('toPath', i) as string,
					};

					endpoint = 'https://api.dropboxapi.com/2/files/move_v2';
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			if (resource === 'file' && operation === 'download') {
				// Return the data as a buffer
				options = { encoding: null };
			}

			let responseData = await dropboxApiRequest.call(this, requestMethod, endpoint, body, query, headers, options);

			if (resource === 'file' && operation === 'upload') {
				responseData = JSON.parse(responseData);
			}

			if (resource === 'file' && operation === 'download') {

				const newItem: INodeExecutionData = {
					json: items[i].json,
					binary: {},
				};

				if (items[i].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[i].binary);
				}

				items[i] = newItem;

				const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

				const filePathDownload = this.getNodeParameter('path', i) as string;
				items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(Buffer.from(responseData), filePathDownload);

			} else if (resource === 'folder' && operation === 'list') {

				const propNames: { [key: string]: string } = {
					'id': 'id',
					'name': 'name',
					'client_modified': 'lastModifiedClient',
					'server_modified': 'lastModifiedServer',
					'rev': 'rev',
					'size': 'contentSize',
					'.tag': 'type',
					'content_hash': 'contentHash',
				};

				for (const item of responseData.entries) {
					const newItem: IDataObject = {};

					// Get the props and save them under a proper name
					for (const propName of Object.keys(propNames)) {
						if (item[propName] !== undefined) {
							newItem[propNames[propName]] = item[propName];
						}
					}

					returnData.push(newItem as IDataObject);
				}
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output items get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
