import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';


export class Dropbox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dropbox',
		name: 'dropbox',
		icon: 'file:dropbox.png',
		group: ['input'],
		version: 1,
		description: 'Access data on Dropbox',
		defaults: {
			name: 'Dropbox',
			color: '#22BB44',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dropboxApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a file or folder',
					},
					{
						name: 'Create Folder',
						value: 'createFolder',
						description: 'Creates a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Deletes a file or folder',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						description: 'Downloads a file',
					},
					{
						name: 'Get Folder Content',
						value: 'listFolderContent',
						description: 'Returns the files and folder in a given folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Moves a file or folder',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Uploads a file into a folder',
					},
				],
				default: 'uploadFile',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         copy
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
							'copy'
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
							'copy'
						],
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder.',
			},


			// ----------------------------------
			//         createFolder
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
							'createFolder'
						],
					},
				},
				placeholder: '/invoices/2019',
				description: 'The folder to create. The parent folder has to exist.',
			},

			// ----------------------------------
			//         delete
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
							'delete'
						],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description: 'The path to delete. Can be a single file or a whole folder.',
			},

			// ----------------------------------
			//         downloadFile
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
							'downloadFile'
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
							'downloadFile'
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},

			// ----------------------------------
			//         listFolderContent
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'listFolderContent'
						],
					},
				},
				placeholder: '/invoices/2019/',
				description: 'The path of which to list the content.',
			},


			// ----------------------------------
			//         move
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
							'move'
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
							'move'
						],
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder.',
			},


			// ----------------------------------
			//         uploadFile
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
							'uploadFile'
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
							'uploadFile'
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
							'uploadFile'
						],
						binaryData: [
							false
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
							'uploadFile'
						],
						binaryData: [
							true
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file to be uploaded.',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('dropboxApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';
		let body: IDataObject | Buffer;
		let isJson = false;

		let headers: IDataObject;

		for (let i = 0; i < items.length; i++) {
			body = {};
			headers = {
				'Authorization': `Bearer ${credentials.accessToken}`,
			};

			if (operation === 'copy') {
				// ----------------------------------
				//         copy
				// ----------------------------------

				requestMethod = 'POST';
				isJson = true;
				body = {
					from_path: this.getNodeParameter('path', i) as string,
					to_path: this.getNodeParameter('toPath', i) as string,
				};

				endpoint = 'https://api.dropboxapi.com/2/files/copy_v2';

			} else if (operation === 'createFolder') {
				// ----------------------------------
				//         createFolder
				// ----------------------------------

				requestMethod = 'POST';
				isJson = true;
				body = {
					path: this.getNodeParameter('path', i) as string,
				};

				endpoint = 'https://api.dropboxapi.com/2/files/create_folder_v2';

			} else if (operation === 'delete') {
				// ----------------------------------
				//         delete
				// ----------------------------------

				requestMethod = 'POST';
				isJson = true;
				body = {
					path: this.getNodeParameter('path', i) as string,
				};

				endpoint = 'https://api.dropboxapi.com/2/files/delete_v2';

			} else if (operation === 'downloadFile') {
				// ----------------------------------
				//         downloadFile
				// ----------------------------------

				requestMethod = 'POST';
				headers['Dropbox-API-Arg'] = JSON.stringify({
					path: this.getNodeParameter('path', i) as string,
				});

				endpoint = 'https://content.dropboxapi.com/2/files/download';

			} else if (operation === 'listFolderContent') {
				// ----------------------------------
				//         listFolderContent
				// ----------------------------------

				requestMethod = 'POST';
				isJson = true;
				body = {
					path: this.getNodeParameter('path', i) as string,
					limit: 2000,
				};

				// TODO: If more files than the max-amount exist it has to be possible to
				//       also request them.

				endpoint = 'https://api.dropboxapi.com/2/files/list_folder';

			} else if (operation === 'move') {
				// ----------------------------------
				//         move
				// ----------------------------------

				requestMethod = 'POST';
				isJson = true;
				body = {
					from_path: this.getNodeParameter('path', i) as string,
					to_path: this.getNodeParameter('toPath', i) as string,
				};

				endpoint = 'https://api.dropboxapi.com/2/files/move_v2';

			} else if (operation === 'uploadFile') {
				// ----------------------------------
				//         uploadFile
				// ----------------------------------

				requestMethod = 'POST';
				headers['Content-Type'] = 'application/octet-stream';
				headers['Dropbox-API-Arg'] = JSON.stringify({
					mode: 'overwrite',
					path: this.getNodeParameter('path', i) as string,
				});

				endpoint = 'https://content.dropboxapi.com/2/files/upload';

				if (this.getNodeParameter('binaryData', i) === true) {
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
			} else {
				throw new Error(`The operation "${operation}" is not known!`);
			}


			const options: OptionsWithUri = {
				headers,
				method: requestMethod,
				qs: {},
				uri: endpoint,
				json: isJson,
			};

			if (Object.keys(body).length) {
				options.body = body;
			}

			if (operation === 'downloadFile') {
				// Return the data as a buffer
				options.encoding = null;
			}

			const responseData = await this.helpers.request(options);

			if (operation === 'downloadFile') {
				// TODO: Has to check if it already exists and only add if not
				if (items[i].binary === undefined) {
					items[i].binary = {};
				}
				const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

				const filePathDownload = this.getNodeParameter('path', i) as string;
				items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(responseData, filePathDownload);

			} else if (operation === 'listFolderContent') {

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

		if (operation === 'downloadFile') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
