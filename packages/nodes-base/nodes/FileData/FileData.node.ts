import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class FileData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'File Data',
		name: 'fileData',
		icon: 'fa:file',
		group: ['input'],
		version: 1,
		hidden: true,
		description: 'Outputs uploaded file as binary data',
		defaults: {
			name: 'File Data',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node provides access to file data uploaded via the Drag and Drop upload feature.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the uploaded file in binary data storage',
				isNodeSetting: true,
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'The original name of the file',
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				description: 'The MIME type of the file',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property to write the file data to',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const fileId = this.getNodeParameter('fileId', itemIndex) as string;
				const fileName = this.getNodeParameter('fileName', itemIndex) as string;
				const mimeType = this.getNodeParameter('mimeType', itemIndex) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;

				const stream = await this.helpers.getBinaryStream(fileId);
				const binaryData = await this.helpers.prepareBinaryData(stream, fileName, mimeType);

				returnData.push({
					json: { fileName, mimeType },
					binary: { [dataPropertyName]: binaryData },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
