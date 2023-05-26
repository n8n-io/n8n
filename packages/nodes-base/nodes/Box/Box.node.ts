import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { boxApiRequest, boxApiRequestAllItems } from './GenericFunctions';

import { fileFields, fileOperations } from './FileDescription';

import { folderFields, folderOperations } from './FolderDescription';

import moment from 'moment-timezone';

import { noCase } from 'change-case';

export class Box implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Box',
		name: 'box',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:box.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Box API',
		defaults: {
			name: 'Box',
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
				noDataExpression: true,
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
			},
			...fileOperations,
			...fileFields,
			...folderOperations,
			...folderFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const timezone = this.getTimezone();
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'file') {
					// https://developer.box.com/reference/post-files-id-copy
					if (operation === 'copy') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const parentId = this.getNodeParameter('parentId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
						responseData = await boxApiRequest.call(
							this,
							'POST',
							`/files/${fileId}/copy`,
							body,
							qs,
						);
					}
					// https://developer.box.com/reference/delete-files-id
					if (operation === 'delete') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						responseData = await boxApiRequest.call(this, 'DELETE', `/files/${fileId}`);
						responseData = { success: true };
					}
					// https://developer.box.com/reference/get-files-id-content
					if (operation === 'download') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
						responseData = await boxApiRequest.call(this, 'GET', `/files/${fileId}`);

						const fileName = responseData.name;

						let mimeType: string | undefined;

						responseData = await boxApiRequest.call(
							this,
							'GET',
							`/files/${fileId}/content`,
							{},
							{},
							undefined,
							{ encoding: null, resolveWithFullResponse: true },
						);

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
							Object.assign(newItem.binary!, items[i].binary);
						}

						items[i] = newItem;

						const data = Buffer.from(responseData.body as string);

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName as string,
							mimeType,
						);
					}
					// https://developer.box.com/reference/get-files-id
					if (operation === 'get') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						if (additionalFields.fields) {
							qs.fields = additionalFields.fields as string;
						}
						responseData = await boxApiRequest.call(this, 'GET', `/files/${fileId}`, {}, qs);
					}
					// https://developer.box.com/reference/get-search/
					if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const tz = this.getTimezone();
						qs.type = 'file';
						qs.query = query;
						Object.assign(qs, additionalFields);

						if (qs.content_types) {
							qs.content_types = (qs.content_types as string).split(',');
						}

						if (additionalFields.createdRangeUi) {
							const createdRangeValues = (additionalFields.createdRangeUi as IDataObject)
								.createdRangeValuesUi as IDataObject;
							if (createdRangeValues) {
								const from = moment.tz(createdRangeValues.from, tz).format();
								const to = moment.tz(createdRangeValues.to, tz).format();
								qs.created_at_range = `${from},${to}`;
							}
							delete qs.createdRangeUi;
						}

						if (additionalFields.updatedRangeUi) {
							const updateRangeValues = (additionalFields.updatedRangeUi as IDataObject)
								.updatedRangeValuesUi as IDataObject;
							if (updateRangeValues) {
								qs.updated_at_range = `${moment.tz(updateRangeValues.from, tz).format()},${moment
									.tz(updateRangeValues.to, tz)
									.format()}`;
							}
							delete qs.updatedRangeUi;
						}

						if (returnAll) {
							responseData = await boxApiRequestAllItems.call(
								this,
								'entries',
								'GET',
								'/search',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await boxApiRequest.call(this, 'GET', '/search', {}, qs);
							responseData = responseData.entries;
						}
					}
					// https://developer.box.com/reference/post-collaborations/
					if (operation === 'share') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const role = this.getNodeParameter('role', i) as string;
						const accessibleBy = this.getNodeParameter('accessibleBy', i) as string;
						const options = this.getNodeParameter('options', i);

						const body: { accessible_by: IDataObject; [key: string]: any } = {
							accessible_by: {},
							item: {
								id: fileId,
								type: 'file',
							},
							role: role === 'coOwner' ? 'co-owner' : noCase(role),
							...options,
						};

						if (body.fields) {
							qs.fields = body.fields;
							delete body.fields;
						}

						if (body.expires_at) {
							body.expires_at = moment.tz(body.expires_at, timezone).format();
						}

						if (body.notify) {
							qs.notify = body.notify;
							delete body.notify;
						}

						if (accessibleBy === 'user') {
							const useEmail = this.getNodeParameter('useEmail', i) as boolean;
							if (useEmail) {
								body.accessible_by.login = this.getNodeParameter('email', i) as string;
							} else {
								body.accessible_by.id = this.getNodeParameter('userId', i) as string;
							}
						} else {
							body.accessible_by.id = this.getNodeParameter('groupId', i) as string;
						}

						responseData = await boxApiRequest.call(this, 'POST', '/collaborations', body, qs);
					}
					// https://developer.box.com/reference/post-files-content
					if (operation === 'upload') {
						const parentId = this.getNodeParameter('parentId', i) as string;
						const isBinaryData = this.getNodeParameter('binaryData', i);
						const fileName = this.getNodeParameter('fileName', i) as string;

						const attributes: IDataObject = {};

						if (parentId !== '') {
							attributes.parent = { id: parentId };
						} else {
							// if not parent defined save it on the root directory
							attributes.parent = { id: 0 };
						}

						if (isBinaryData) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
							const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
								i,
								binaryPropertyName,
							);

							const body: IDataObject = {};

							attributes.name = fileName || binaryData.fileName;

							body.attributes = JSON.stringify(attributes);

							body.file = {
								value: binaryDataBuffer,
								options: {
									filename: binaryData.fileName,
									contentType: binaryData.mimeType,
								},
							};

							responseData = await boxApiRequest.call(
								this,
								'POST',
								'',
								{},
								{},
								'https://upload.box.com/api/2.0/files/content',
								{ formData: body },
							);
							responseData = responseData.entries;
						} else {
							const content = this.getNodeParameter('fileContent', i) as string;

							if (fileName === '') {
								throw new NodeOperationError(this.getNode(), 'File name must be set!', {
									itemIndex: i,
								});
							}

							attributes.name = fileName;

							const body: IDataObject = {};

							body.attributes = JSON.stringify(attributes);

							body.file = {
								value: Buffer.from(content),
								options: {
									filename: fileName,
									contentType: 'text/plain',
								},
							};
							responseData = await boxApiRequest.call(
								this,
								'POST',
								'',
								{},
								{},
								'https://upload.box.com/api/2.0/files/content',
								{ formData: body },
							);
							responseData = responseData.entries;
						}
					}
				}
				if (resource === 'folder') {
					// https://developer.box.com/reference/post-folders
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const parentId = this.getNodeParameter('parentId', i) as string;
						const options = this.getNodeParameter('options', i);
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
					}
					// https://developer.box.com/reference/delete-folders-id
					if (operation === 'delete') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const recursive = this.getNodeParameter('recursive', i) as boolean;
						qs.recursive = recursive;

						responseData = await boxApiRequest.call(this, 'DELETE', `/folders/${folderId}`, qs);
						responseData = { success: true };
					}
					// https://developer.box.com/reference/get-folders-id/
					if (operation === 'get') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						responseData = await boxApiRequest.call(this, 'GET', `/folders/${folderId}`, qs);
					}
					// https://developer.box.com/reference/get-search/
					if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const tz = this.getTimezone();
						qs.type = 'folder';
						qs.query = query;
						Object.assign(qs, additionalFields);

						if (qs.content_types) {
							qs.content_types = (qs.content_types as string).split(',');
						}

						if (additionalFields.createdRangeUi) {
							const createdRangeValues = (additionalFields.createdRangeUi as IDataObject)
								.createdRangeValuesUi as IDataObject;
							if (createdRangeValues) {
								qs.created_at_range = `${moment.tz(createdRangeValues.from, tz).format()},${moment
									.tz(createdRangeValues.to, tz)
									.format()}`;
							}
							delete qs.createdRangeUi;
						}

						if (additionalFields.updatedRangeUi) {
							const updateRangeValues = (additionalFields.updatedRangeUi as IDataObject)
								.updatedRangeValuesUi as IDataObject;
							if (updateRangeValues) {
								qs.updated_at_range = `${moment.tz(updateRangeValues.from, tz).format()},${moment
									.tz(updateRangeValues.to, tz)
									.format()}`;
							}
							delete qs.updatedRangeUi;
						}

						if (returnAll) {
							responseData = await boxApiRequestAllItems.call(
								this,
								'entries',
								'GET',
								'/search',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await boxApiRequest.call(this, 'GET', '/search', {}, qs);
							responseData = responseData.entries;
						}
					}
					// https://developer.box.com/reference/post-collaborations/
					if (operation === 'share') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const role = this.getNodeParameter('role', i) as string;
						const accessibleBy = this.getNodeParameter('accessibleBy', i) as string;
						const options = this.getNodeParameter('options', i);

						const body: { accessible_by: IDataObject; [key: string]: any } = {
							accessible_by: {},
							item: {
								id: folderId,
								type: 'folder',
							},
							role: role === 'coOwner' ? 'co-owner' : noCase(role),
							...options,
						};

						if (body.fields) {
							qs.fields = body.fields;
							delete body.fields;
						}

						if (body.expires_at) {
							body.expires_at = moment.tz(body.expires_at, timezone).format();
						}

						if (body.notify) {
							qs.notify = body.notify;
							delete body.notify;
						}

						if (accessibleBy === 'user') {
							const useEmail = this.getNodeParameter('useEmail', i) as boolean;
							if (useEmail) {
								body.accessible_by.login = this.getNodeParameter('email', i) as string;
							} else {
								body.accessible_by.id = this.getNodeParameter('userId', i) as string;
							}
						} else {
							body.accessible_by.id = this.getNodeParameter('groupId', i) as string;
						}

						responseData = await boxApiRequest.call(this, 'POST', '/collaborations', body, qs);
					}
					//https://developer.box.com/guides/folders/single/move/
					if (operation === 'update') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (updateFields.fields) {
							qs.fields = updateFields.fields;
							delete updateFields.fields;
						}

						const body = {
							...updateFields,
						} as IDataObject;

						if (body.parentId) {
							body.parent = {
								id: body.parentId,
							};
							delete body.parentId;
						}

						if (body.tags) {
							body.tags = (body.tags as string).split(',');
						}

						responseData = await boxApiRequest.call(this, 'PUT', `/folders/${folderId}`, body, qs);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			return this.prepareOutputData(returnData);
		}
	}
}
