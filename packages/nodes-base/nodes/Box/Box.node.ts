import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	boxApiRequest,
	boxApiRequestAllItems,
} from './GenericFunctions';

import {
	fileFields,
	fileOperations,
} from './FileDescription';

import {
	folderFields,
	folderOperations,
} from './FolderDescription';

import * as moment from 'moment-timezone';

export class Box implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Box',
		name: 'box',
		icon: 'file:box.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Box API',
		defaults: {
			name: 'Box',
			color: '#00aeef',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'boxOAuth2Api',
				required: true,
			},
		],
		properties: [
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
			...fileOperations,
			...fileFields,
			...folderOperations,
			...folderFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'file') {
				// https://developer.box.com/reference/post-files-id-copy
				if (operation === 'copy') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const parentId = this.getNodeParameter('parentId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {};
					if (additionalFields.name) {
						body.name = additionalFields.name as string;
					}
					if (parentId) {
						body.parent = { id: parentId };
					} else {
						body.parent = { id: 0 };
					}
					if (additionalFields.fields) {
						qs.fields = additionalFields.fields as string;
					}
					if (additionalFields.version) {
						body.version = additionalFields.version as string;
					}
					responseData = await boxApiRequest.call(this, 'POST', `/files/${fileId}/copy`, body, qs);

					returnData.push(responseData as IDataObject);
				}
				// https://developer.box.com/reference/delete-files-id
				if (operation === 'delete') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					responseData = await boxApiRequest.call(this, 'DELETE', `/files/${fileId}`);
					responseData = { success: true };
					returnData.push(responseData as IDataObject);
				}
				// https://developer.box.com/reference/get-files-id-content
				if (operation === 'download') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;
					responseData = await boxApiRequest.call(this, 'GET', `/files/${fileId}`);

					const fileName = responseData.name;

					let mimeType: string | undefined;

					responseData = await boxApiRequest.call(this, 'GET', `/files/${fileId}/content`, {}, {}, undefined, { resolveWithFullResponse: true });

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (mimeType === undefined && responseData.headers['content-type']) {
						mimeType = responseData.headers['content-type'];
					}

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;

					const data = Buffer.from(responseData.body);

					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, fileName, mimeType);
				}
				// https://developer.box.com/reference/get-files-id
				if (operation === 'get') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					if (additionalFields.fields) {
						qs.fields = additionalFields.fields as string;
					}
					responseData = await boxApiRequest.call(this, 'GET', `/files/${fileId}`, {}, qs);
					returnData.push(responseData as IDataObject);
				}
				// https://developer.box.com/reference/get-search/
				if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const timezone = this.getTimezone();
					qs.type = 'file';
					qs.query = query;
					Object.assign(qs, additionalFields);

					if (qs.content_types) {
						qs.content_types = (qs.content_types as string).split(',');
					}

					if (additionalFields.createdRangeUi) {
						const createdRangeValues = (additionalFields.createdRangeUi as IDataObject).createdRangeValuesUi as IDataObject;
						if (createdRangeValues) {
							qs.created_at_range = `${moment.tz(createdRangeValues.from, timezone).format()},${moment.tz(createdRangeValues.to, timezone).format()}`;
						}
						delete qs.createdRangeUi;
					}

					if (additionalFields.updatedRangeUi) {
						const updateRangeValues = (additionalFields.updatedRangeUi as IDataObject).updatedRangeValuesUi as IDataObject;
						if (updateRangeValues) {
							qs.updated_at_range = `${moment.tz(updateRangeValues.from, timezone).format()},${moment.tz(updateRangeValues.to, timezone).format()}`;
						}
						delete qs.updatedRangeUi;
					}

					if (returnAll) {
						responseData = await boxApiRequestAllItems.call(this, 'entries', 'GET', `/search`, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await boxApiRequest.call(this, 'GET', `/search`, {}, qs);
						responseData = responseData.entries;
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
				// https://developer.box.com/reference/post-files-content
				if (operation === 'upload') {
					const parentId = this.getNodeParameter('parentId', i) as string;
					const isBinaryData = this.getNodeParameter('binaryData', i) as boolean;
					const fileName = this.getNodeParameter('fileName', i) as string;

					const attributes: IDataObject = {};

					if (parentId !== '') {
						attributes['parent'] = { id: parentId };
					} else {
						// if not parent defined save it on the root directory
						attributes['parent'] = { id: 0 };
					}

					if (isBinaryData) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;

						if (items[i].binary === undefined) {
							throw new Error('No binary data exists on item!');
						}
						//@ts-ignore
						if (items[i].binary[binaryPropertyName] === undefined) {
							throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];

						const body: IDataObject = {};

						attributes['name'] = fileName || binaryData.fileName;

						body['attributes'] = JSON.stringify(attributes);

						body['file'] = {
							value: Buffer.from(binaryData.data, BINARY_ENCODING),
							options: {
								filename: binaryData.fileName,
								contentType: binaryData.mimeType,
							},
						};

						responseData = await boxApiRequest.call(this, 'POST', '', {}, {}, 'https://upload.box.com/api/2.0/files/content', { formData: body });

						returnData.push.apply(returnData, responseData.entries as IDataObject[]);

					} else {
						const content = this.getNodeParameter('fileContent', i) as string;

						if (fileName === '') {
							throw new Error('File name must be set!');
						}

						attributes['name'] = fileName;

						const body: IDataObject = {};

						body['attributes'] = JSON.stringify(attributes);

						body['file'] = {
							value: Buffer.from(content),
							options: {
								filename: fileName,
								contentType: 'text/plain',
							},
						};
						responseData = await boxApiRequest.call(this, 'POST', '', {}, {}, 'https://upload.box.com/api/2.0/files/content', { formData: body });

						returnData.push.apply(returnData, responseData.entries as IDataObject[]);
					}
				}
			}
			if (resource === 'folder') {
				// https://developer.box.com/reference/post-folders
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const parentId = this.getNodeParameter('parentId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: IDataObject = {
						name,
					};

					if (parentId) {
						body.parent = { id: parentId };
					} else {
						body.parent = { id: 0 };
					}

					if (options.access) {
						body.folder_upload_email = {
							access: options.access as string,
						};
					}

					if (options.fields) {
						qs.fields = options.fields as string;
					}

					responseData = await boxApiRequest.call(this, 'POST', '/folders', body, qs);

					returnData.push(responseData);
				}
				// https://developer.box.com/reference/delete-folders-id
				if (operation === 'delete') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					const recursive = this.getNodeParameter('recursive', i) as boolean;
					qs.recursive = recursive;

					responseData = await boxApiRequest.call(this, 'DELETE', `/folders/${folderId}`, qs);
					responseData = { success: true };
					returnData.push(responseData as IDataObject);
				}
				// https://developer.box.com/reference/get-folders-id/
				if (operation === 'get') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					responseData = await boxApiRequest.call(this, 'GET', `/folders/${folderId}`, qs);
					returnData.push(responseData as IDataObject);
				}
				// https://developer.box.com/reference/get-search/
				if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const timezone = this.getTimezone();
					qs.type = 'folder';
					qs.query = query;
					Object.assign(qs, additionalFields);

					if (qs.content_types) {
						qs.content_types = (qs.content_types as string).split(',');
					}

					if (additionalFields.createdRangeUi) {
						const createdRangeValues = (additionalFields.createdRangeUi as IDataObject).createdRangeValuesUi as IDataObject;
						if (createdRangeValues) {
							qs.created_at_range = `${moment.tz(createdRangeValues.from, timezone).format()},${moment.tz(createdRangeValues.to, timezone).format()}`;
						}
						delete qs.createdRangeUi;
					}

					if (additionalFields.updatedRangeUi) {
						const updateRangeValues = (additionalFields.updatedRangeUi as IDataObject).updatedRangeValuesUi as IDataObject;
						if (updateRangeValues) {
							qs.updated_at_range = `${moment.tz(updateRangeValues.from, timezone).format()},${moment.tz(updateRangeValues.to, timezone).format()}`;
						}
						delete qs.updatedRangeUi;
					}

					if (returnAll) {
						responseData = await boxApiRequestAllItems.call(this, 'entries', 'GET', `/search`, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await boxApiRequest.call(this, 'GET', `/search`, {}, qs);
						responseData = responseData.entries;
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
