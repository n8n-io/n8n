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

type GenericValueNotUndefined = string | object | number | boolean;


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
				displayName: 'JSON Parameters For Files',
				name: 'jsonParametersFiles',
				type: 'boolean',
				default: false,
				description: 'Choose if the files should be passed as JSON Array.',
			},
			{
				displayName: 'Files',
				name: 'files',
				placeholder: 'Add File',
				type: 'fixedCollection',
				default: '',
				displayOptions: {
					show: {
						jsonParametersFiles: [
							false,
						],
					},
				},
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
				displayName: 'Files JSON',
				name: 'filesJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						jsonParametersFiles: [
							true,
						],
					},
				},

				description: 'Files to send to firehose in JSON Format. Needs to be structured as an Array.',
			},
			{
				displayName: 'JSON Parameters For Records',
				name: 'jsonParametersRecords',
				type: 'boolean',
				default: false,
				description: 'Choose if the records should be passed as JSON Array.',
			},
			{
				displayName: 'Records',
				name: 'records',
				placeholder: 'Add Record',
				type: 'fixedCollection',
				default: '',
				displayOptions: {
					show: {
						jsonParametersRecords: [
							false,
						],
					},
				},
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
			{
				displayName: 'Records JSON',
				name: 'recordsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						jsonParametersRecords: [
							true,
						],
					},
				},

				description: 'Records to send to firehose in JSON Format. Needs to be structured as an Array.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: IDataObject[] = [];
		const body: IDataObject = {};
		const qs: IDataObject = {};

		let responseData;
		let item: INodeExecutionData;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'putRecordBatch') {
					const action = 'Firehose_20150804.PutRecordBatch';

					body.DeliveryStreamName = this.getNodeParameter('deliveryStreamName', i) as string;

					const records = [] as IDataObject[];

					item = items[i];

					const recordsAsJson = this.getNodeParameter('jsonParametersRecords', i) as string;

					if(recordsAsJson){
						let recordsJson = this.getNodeParameter('recordsJson', i) as Records;
						if(typeof recordsJson === 'string'){
							recordsJson = JSON.parse(recordsJson);
						}
						if(!Array.isArray(recordsJson)){
							throw new NodeOperationError(this.getNode(), 'You must provide an array or a JSON representation of an array. Entries of this array are flexible but need to be base64 encodable. They are encoded and sent to Firehose.');
						}
						recordsJson.forEach((record) => {
							const buffer = Buffer.from(record);
							records.push({Data: buffer.toString('base64')});
						});
					} else {
						const recordsData = this.getNodeParameter('records', i) as Records;
						if(recordsData  && recordsData.record){
							for( let i= 0; i < recordsData.record.length; i++){
								const data = recordsData.record[i].data as string;
								const buffer = Buffer.from(data as string);
								records.push({Data: buffer.toString('base64')});
							}
						}
					}
					const filesAsJson = this.getNodeParameter('jsonParametersFiles', i) as string;

					if(filesAsJson){
						let filesJson = this.getNodeParameter('filesJson', i) as Files;
						if(typeof filesJson === 'string'){
							filesJson = JSON.parse(filesJson);
						}
						if(!Array.isArray(filesJson)){
							throw new NodeOperationError(this.getNode(), 'You must provide an array or a JSON representation of an array. Entries of this array need to be property names of files stored in n8n. Every file will be base4 encoded and sent to Firehose.');
						}
						filesJson.forEach((file) => {
							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data set. So file can not be read!');
							}

							if (item.binary[file] === undefined) {
								throw new NodeOperationError(this.getNode(), `The binary property "${file}" does not exist. So file can not be read!`);
							}

							const buffer = Buffer.from(file);
							records.push({Data: buffer.toString('base64')});
						});
					} else {
						const filesData = this.getNodeParameter('files', i) as Files;
						if(filesData && filesData.file){
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
