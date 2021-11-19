import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,
	NodeOperationError, } from 'n8n-workflow';

import { awsApiRequestREST } from './GenericFunctions';

type Records = {
	record: Record[];
};

type Record = {
	[name: string]: string;
};

type Files = {
	file: File[];
};

type File = {
	[name: string]: string;
};

export class AwsFirehose implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Firehose',
		name: 'awsFirehose',
		icon: 'file:firehose.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume AWS Firehose API',
		defaults: {
			name: 'AWS Firehose',
			color: '#ea3e40',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'putRecordBatch',
						value: 'putRecordBatch',
					},
				],
				default: 'putRecordBatch',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Delivery Stream Name',
				name: 'deliveryStreamName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['putRecordBatch'],
					},
				},
				description:
					'The name of the delivery stream.',
			},
			{
				displayName: 'Files',
				name: 'files',
				placeholder: 'Add File',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Which files to send to firehose.',
				options: [
					{
						displayName: 'File',
						name: 'file',
						values: [
							{
								displayName: 'Property Name',
								name: 'dataPropertyName',
								type: 'string',
								default: 'data',
								description: 'Name of the binary property which contains the data for the file to be written.',
							},
						],
					},
				],
			},
			{
				displayName: 'Records',
				name: 'records',
				placeholder: 'Add Record',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Which data records to send to firehose.',
				options: [
					{
						displayName: 'Record',
						name: 'record',
						values: [
							{
								displayName: 'Data',
								name: 'data',
								type: 'string',
								default: '',
								description: 'Raw Data to send to Firehose.',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: IDataObject[] = [];
		const qs: IDataObject = {};

		let responseData;
		let item: INodeExecutionData;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'putRecordBatch') {
					const action = 'Firehose_20150804.PutRecordBatch';

					const body: IDataObject = {};
					body.DeliveryStreamName = this.getNodeParameter('deliveryStreamName', i) as string;

					let records = [] as IDataObject[];

					item = items[i];

					const recordsData = this.getNodeParameter('records', i) as Records;
					if(recordsData){
						for( let i= 0; i < recordsData.record.length; i++){
							const data = recordsData.record[i].data as string;
							const buffer = Buffer.from(data as string);
							records.push({Data: buffer.toString('base64')});
						}
					}

					const filesData = this.getNodeParameter('files', i) as Files;
					if(filesData){
						for( let i= 0; i < filesData.file.length; i++){
							const dataPropertyName = filesData.file[i].dataPropertyName as string;

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data set. So file can not be read!');
							}

							if (item.binary[dataPropertyName] === undefined) {
								throw new NodeOperationError(this.getNode(), `The binary property "${dataPropertyName}" does not exist. So file can not be read!`);
							}

							const buffer = await this.helpers.getBinaryDataBuffer(i, dataPropertyName);
							records.push({Data: buffer.toString('base64')});
						}
					}

					body.Records = records;

					responseData = await awsApiRequestREST.call(
						this,
						'firehose',
						'POST',
						'',
						JSON.stringify(body),
						{
							'X-Amz-Target': action,
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					// @ts-ignore:next-line
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
