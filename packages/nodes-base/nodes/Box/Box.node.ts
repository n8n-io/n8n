import { IExecuteFunctions, BINARY_ENCODING } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IBinaryData,
} from 'n8n-workflow';

import {
	boxApiResources,
} from './box.resource.properties';

import {
	boxApiCredentialsProvider,
	boxNodeProperties,
	boxNodeConstants,
	folderApiParamType,
	fileApiParamType,
	boxApiResourceType,
	boxApiResourceActionTypes
} from './box.constants';

import {
	boxFolderOperations
} from './operations/box-folder.operations';

import {
	boxFileOperations
} from './operations/box-file.operations';

import {
	boxApiErrorMessages
} from './box.messages';

import {
	fetchFolders,
	addFolder,
	copyFolder,
	modifyFolder,
	deleteFolder
} from './helpers/box-folder-helpers';

import {
	downloadFile,
	copyFile,
	modifyFile,
	deleteFile,
	uploadFile
} from './helpers/box-file.helpers';

import {
	IBoxApiFolderOptions,
	IBoxApiAddFolderOptions,
	IBoxApiCopyFolderOptions,
	IBoxApiModifyFolderOptions,
	IBoxApiDeleteFolderOptions,
	IBoxApiDownloadFileOptions,
	IBoxApiDeleteOptions,
	IBoxApiUploadOptions,
	IBoxApiCopyFileOptions,
	IBoxApiModifyFileOptions
} from './interfaces/index';

export class Box implements INodeType {
	description: INodeTypeDescription = {
		displayName: boxNodeProperties.displayName,
		name: boxNodeProperties.name,
		group: boxNodeProperties.group,
		version: boxNodeProperties.version,
		icon: boxNodeProperties.icon,
		description: boxNodeProperties.description,
		defaults: boxNodeProperties.defaults,
		inputs: boxNodeProperties.inputs,
		outputs: boxNodeProperties.outputs,
		credentials: [
			{
				name: boxApiCredentialsProvider,
				required: true,
			}
		],
		properties: [
			...boxApiResources,
			...boxFolderOperations,
			...boxFileOperations
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials(boxApiCredentialsProvider);

		if (credentials === undefined) {
			throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
		}

		const resource = this.getNodeParameter(boxNodeConstants.resource, 0) as string;
		const operation = this.getNodeParameter(boxNodeConstants.operation, 0) as string;

		let responseData = {};

		for (let i = 0; i < items.length; i++) {
			if (resource === boxApiResourceType.folderVal) {
				switch (operation) {
					case boxApiResourceActionTypes.listVal:
						responseData = await fetchFolders(
							credentials.accessToken as string,
							this,
							{
								offset: this.getNodeParameter(folderApiParamType.offsetVal, i) as number,
								limit: this.getNodeParameter(folderApiParamType.limitVal, i) as number
							} as IBoxApiFolderOptions);
						break;

					case boxApiResourceActionTypes.createVal:
						responseData = await addFolder(
							credentials.accessToken as string,
							this,
							{
								name: this.getNodeParameter(folderApiParamType.folderNameVal, i) as string,
								parent: this.getNodeParameter(folderApiParamType.folderParentVal, i) as string,
								folderUploadEmail: this.getNodeParameter(folderApiParamType.folderUploadEmailVal, i) as string
							} as IBoxApiAddFolderOptions,
						);
						break;

					case boxApiResourceActionTypes.copyVal:
						responseData = await copyFolder(
							credentials.accessToken as string,
							this,
							{
								folder: this.getNodeParameter(folderApiParamType.currentFolderVal, i) as string,
								parent: this.getNodeParameter(folderApiParamType.folderParentVal, i) as string,
								name: this.getNodeParameter(folderApiParamType.folderNameVal, i) as string
							} as IBoxApiCopyFolderOptions,
						);
						break;

					case boxApiResourceActionTypes.modifyVal:
						responseData = await modifyFolder(
							credentials.accessToken as string,
							this,
							{
								folder: this.getNodeParameter(folderApiParamType.currentFolderVal, i) as string,
								parent: this.getNodeParameter(folderApiParamType.folderParentVal, i) as string,
								name: this.getNodeParameter(folderApiParamType.folderNameVal, i) as string,
								description: this.getNodeParameter(folderApiParamType.folderDescriptionVal, i) as string,
								folderUploadEmail: this.getNodeParameter(folderApiParamType.folderUploadEmailVal, i) as string
								//tags: this.getNodeParameter(folderApiParamType.tagsVal, i) as Array<string>,
							} as IBoxApiModifyFolderOptions,
						);
						break;

					case boxApiResourceActionTypes.deleteVal:
						responseData = await deleteFolder(
							credentials.accessToken as string,
							this,
							{
								folder: this.getNodeParameter(folderApiParamType.currentFolderVal, i) as string,
								recursive: this.getNodeParameter(folderApiParamType.recursiveVal, i) as boolean,
							} as IBoxApiDeleteFolderOptions,
						);
						break;
				}
			} else if (resource === boxApiResourceType.fileVal) {
				switch (operation) {
					case boxApiResourceActionTypes.downloadVal:
						let responseBuffer: IBinaryData = await downloadFile(
							credentials.accessToken as string,
							this,
							{
								file: this.getNodeParameter(fileApiParamType.currentFileVal, i) as string,
								destination: this.getNodeParameter(fileApiParamType.binaryPropertyVal, i) as string
							} as IBoxApiDownloadFileOptions);
						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};
						if (items[i].binary !== undefined) {
							Object.assign(newItem.binary, items[i].binary);
						}
						const dataPropertyNameDownload = this.getNodeParameter(fileApiParamType.binaryPropertyVal, i) as string;
						items[i] = newItem;
						items[i].binary![dataPropertyNameDownload] = responseBuffer;
						break;

					case boxApiResourceActionTypes.copyVal:
						responseData = await copyFile(
							credentials.accessToken as string,
							this,
							{
								file: this.getNodeParameter(fileApiParamType.currentFileVal, i) as string,
								version: this.getNodeParameter(fileApiParamType.fileVersionVal, i) as string,
								parent: this.getNodeParameter(fileApiParamType.folderVal, i) as string,
								name: this.getNodeParameter(fileApiParamType.fileNameVal, i) as string
							} as IBoxApiCopyFileOptions,
						);
						break;

					case boxApiResourceActionTypes.modifyVal:
						responseData = await modifyFile(
							credentials.accessToken as string,
							this,
							{
								description: this.getNodeParameter(fileApiParamType.fileDescriptionVal, i) as string,
								file: this.getNodeParameter(fileApiParamType.currentFileVal, i) as string,
								parent: this.getNodeParameter(fileApiParamType.folderVal, i) as string,
								name: this.getNodeParameter(fileApiParamType.fileNameVal, i) as string
							} as IBoxApiModifyFileOptions,
						);
						break;

					case boxApiResourceActionTypes.deleteVal:
						responseData = await deleteFile(
							credentials.accessToken as string,
							this,
							{
								file: this.getNodeParameter(fileApiParamType.currentFileVal, i) as string,
							} as IBoxApiDeleteOptions,
						);
						break;

					case boxApiResourceActionTypes.uploadVal:

						const item = items[i];

						let isBinaryData = this.getNodeParameter(fileApiParamType.binaryDataVal, i)

						let content = '';
						if (isBinaryData) {

							if (item.binary === undefined) {
								throw new Error('No binary data exists on item!');
							}

							const propertyNameUpload = this.getNodeParameter(fileApiParamType.binaryPropertyVal, i) as string;

							if (item.binary[propertyNameUpload] === undefined) {
								throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
							}
							content = item.binary[propertyNameUpload].data;
						}

						responseData = await uploadFile(
							credentials.accessToken as string,
							this,
							{
								content: content,
								isBinary: this.getNodeParameter(fileApiParamType.binaryDataVal, i),
								name: this.getNodeParameter(fileApiParamType.fileNameVal, i),
								parent: this.getNodeParameter(fileApiParamType.folderVal, i),
								path: this.getNodeParameter(fileApiParamType.filePathVal, i),
								type: this.getNodeParameter(fileApiParamType.contentTypeVal, i)
							} as IBoxApiUploadOptions,
						);
						break;
				}
			}
		}

		let isOutput: Boolean = resource === boxApiResourceType.fileVal && operation === boxApiResourceActionTypes.downloadVal;

		if (isOutput) {
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(responseData)];
		}
	}


}
