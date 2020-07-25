import {
	BINARY_ENCODING,
	IExecuteFunctions
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
import { basename } from 'path';


import * as sftpClient from 'ssh2-sftp-client';
const ftpClient = require('@softbrains/promise-ftp');

export class FileTransfer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'File Transfer',
		name: 'fileTransfer',
		icon: 'fa:server',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["protocol"] + ": " + $parameter["operation"]}}',
		description: 'Transfers files via FTP or SFTP.',
		defaults: {
			name: 'FileTransfer',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ftp',
				required: true,
				displayOptions: {
					show: {
						protocol: [
							'ftp',
						],
					},
				},
			},
			{
				name: 'sftp',
				required: true,
				displayOptions: {
					show: {
						protocol: [
							'sftp',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Protocol',
				name: 'protocol',
				type: 'options',
				options: [
					{
						name: 'FTP',
						value: 'ftp'
					},
					{
						name: 'SFTP',
						value: 'sftp'
					},
				],
				default: 'ftp',
				description: 'File transfer protocol.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'List folder content.'
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file.'
					},
				],
				default: 'download',
				description: 'Operation to perform.',
			},
			// ----------------------------------
			//         download
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: [
							'download',
						],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				placeholder: '/documents/invoice.txt',
				description: 'The file path of the file to download. Has to contain the full path.',
				required: true
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: [
							'download',
						],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data.',
				required: true
			},
			// ----------------------------------
			//         upload
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'The file path of the file to upload. Has to contain the full path.',
				required: true
			},
			{
				displayName: 'Binary Data',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
					},
				},
				name: 'binaryData',
				type: 'boolean',
				default: true,
				description: 'The text content of the file to upload.',
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						binaryData: [
							true
						]
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data.',
				required: true
			},
			{
				displayName: 'File Content',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						binaryData: [
							false
						]
					},
				},
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'The text content of the file to upload.',
			},
			// ----------------------------------
			//         list
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'Path of directory to list contents of.',
				required: true
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const qs: IDataObject = {};
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;
		const sftp = new sftpClient();

		for (let i = 0; i < items.length; i++) {
			const protocol = this.getNodeParameter('protocol', 0) as string;

			if (protocol === 'sftp') {
				const credentials = this.getCredentials('sftp');
				const path = this.getNodeParameter('path', i) as string;

				if (credentials === undefined) {
					throw new Error('Failed to get credentials!');
				}

				try {
					await sftp.connect({
						host: credentials.host as string,
						port: credentials.port as number,
						username: credentials.username as string,
						password: credentials.password as string,
					});

					if (operation === 'list') {
						responseData = await sftp.list(path);
					}

					if (operation === 'download') {
						responseData = await sftp.get(path);

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
						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(responseData as Buffer, filePathDownload);

						return this.prepareOutputData(items);
					}

					if (operation === 'upload') {
						const remotePath = this.getNodeParameter('path', i) as string;

						// Check if dir path exists
						const dirExists = await sftp.exists(remotePath);

						// If dir does not exist, create all recursively in path
						if (!dirExists) {
							// Separate filename from dir path
							const fileName = basename(remotePath);
							const dirPath = remotePath.replace(fileName, '');
							// Create directory
							await sftp.mkdir(dirPath, true);
						}

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

							const buffer = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING) as Buffer;
							responseData = await sftp.put(buffer, remotePath, { encoding: null });
						} else {
							// Is text file
							const buffer = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8') as Buffer;
							responseData = await sftp.put(buffer, remotePath);
						}
					}

				} catch (error) {
					throw new Error(error);
				}

			}

			if (protocol === 'ftp') {
				const ftp = new ftpClient();

				const credentials = this.getCredentials('ftp');
				const path = this.getNodeParameter('path', i) as string;

				if (credentials === undefined) {
					throw new Error('Failed to get credentials!');
				}

				try {
					await ftp.connect({
						host: credentials.host,
						port: credentials.port,
						username: credentials.username,
						password: credentials.password
					});

					if (operation === 'list') {
						responseData = await ftp.list(path);
					}

					if (operation === 'download') {
						responseData = await ftp.get(path);

						// Convert readable stream to buffer so that can be displayed properly
						const chunks = [];
						for await (const chunk of responseData) {
							chunks.push(chunk);
						}

						responseData = Buffer.concat(chunks);

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
						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(responseData, filePathDownload);

						return this.prepareOutputData(items);
					}

					if (operation === 'upload') {
						const remotePath = this.getNodeParameter('path', i) as string;

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

							const buffer = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING) as Buffer;
							responseData = await ftp.put(buffer, remotePath);
						} else {
							// Is text file
							const buffer = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8') as Buffer;
							responseData = await ftp.put(buffer, remotePath);
						}
					}

				} catch (error) {
					throw new Error(error);
				}
			}
		}

		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else {
			returnData.push(responseData as unknown as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
