import {
	IExecuteFunctions,
	BINARY_ENCODING,
} from 'n8n-core';

import {
	cortexApiRequest,
	getEntityLabel,
} from './GenericFunctions';

import {
	analyzersOperations,
	analyzerFields,
} from './AnalyzerDescriptions';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	IDataObject,
} from 'n8n-workflow';

import {
	respondersOperations,
	responderFields,
} from './ResponderDescription';

import {
	jobFields,
	jobOperations,
} from './JobDescription';

import {
	upperFirst,
} from 'lodash';

import {
	IJob,
} from './AnalyzerInterface';

export class Cortex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortex',
		name: 'cortex',
		icon: 'file:cortex.png',
		group: ['transform'],
		subtitle: '={{$parameter["resource"]+ ": " + $parameter["operation"]}}',
		version: 1,
		description: 'Apply the Cortex analyzer/responder on the given entity',
		defaults: {
			name: 'Cortex',
			color: '#54c4c3',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'cortexApi',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName:'Resource',
				name:'resource',
				type:'options',
				options:[
					{
						name: 'Analyzer',
						value:'analyzer',
					},
					{
						name: 'Responder',
						value:'responder',
					},
					{
						name: 'Job',
						value:'job',
					},
				],
				default: 'analyzer',
				description: 'Choose a resource',
				required: true,
			},
			...analyzersOperations,
			...analyzerFields,
			...respondersOperations,
			...responderFields,
			...jobOperations,
			...jobFields
		],
	};

	methods = {
		loadOptions: {

			async loadActiveAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the enabled analyzers from instance
				const requestResult = await cortexApiRequest.call(
					this,
					'POST',
					`/analyzer/_search`,
				);

				const returnData: INodePropertyOptions[] = [];

				for (const analyzer of requestResult) {
					returnData.push({
						name: analyzer.name as string,
						value: `${analyzer.id as string}::${analyzer.name as string}`,
						description: analyzer.description as string,
					});
				}

				return returnData;
			},

			async loadActiveResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the enabled responders from instance
				const requestResult = await cortexApiRequest.call(
					this,
					'GET',
					`/responder`,
				);

				const returnData: INodePropertyOptions[] = [];
				for (const responder of requestResult) {
					returnData.push({
						name: responder.name as string,
						value: `${responder.id as string}::${responder.name as string}`,
						description: responder.description as string,
					});
				}
				return returnData;
			},

			async loadObservableOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedAnalyzerId = (this.getNodeParameter('analyzer') as string).split('::')[0];
				// request the analyzers from instance
				const requestResult = await cortexApiRequest.call(
					this,
					'GET',
					`/analyzer/${selectedAnalyzerId}`,
				);

				// parse supported observable types  into options
				const returnData: INodePropertyOptions[] = [];
				for (const dataType of requestResult.dataTypeList) {
					returnData.push(
						{
							name: upperFirst(dataType as string),
							value: dataType as string,
						},
					);
				}
				return returnData;
			},

			async loadDataTypeOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedResponderId = (this.getNodeParameter('responder') as string).split('::')[0];
				// request the responder from instance
				const requestResult = await cortexApiRequest.call(
					this,
					'GET',
					`/responder/${selectedResponderId}`,
				);
				// parse the accepted dataType into options
				const returnData: INodePropertyOptions[] = [];
				for (const dataType of requestResult.dataTypeList) {
					returnData.push(
						{
							value: (dataType as string).split(':')[1],
							name: (dataType as string).split(':')[1]
						},
					);
				}
				return returnData;
			},

		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'analyzer') {
				//https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#run
				if (operation === 'execute') {

					let force = false;

					const analyzer = this.getNodeParameter('analyzer', i) as string;

					const observableType = this.getNodeParameter('observableType', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const tlp = this.getNodeParameter('tlp', i) as string;

					const body: IDataObject = {
						dataType: observableType,
						tlp,
					};

					if (additionalFields.force === true) {
						force = true;
					}

					if (observableType === 'file') {

						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						if (item.binary[binaryPropertyName] === undefined) {
							throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						const fileBufferData = Buffer.from(item.binary[binaryPropertyName].data, BINARY_ENCODING);

						const options = {
							formData: {
								data: {
									value: fileBufferData,
									options: {
										contentType: item.binary[binaryPropertyName].mimeType,
										filename: item.binary[binaryPropertyName].fileName,
									}
								},
								_json: JSON.stringify({
									dataType: observableType,
									tlp,
								})
							}
						};

						responseData = await cortexApiRequest.call(
							this,
							'POST',
							`/analyzer/${analyzer.split('::')[0]}/run`,
							{},
							{ force },
							'',
							options,
						) as IJob;

						continue;

					} else {
						const observableValue = this.getNodeParameter('observableValue', i) as string;

						body.data = observableValue;

						responseData = await cortexApiRequest.call(
							this,
							'POST',
							`/analyzer/${analyzer.split('::')[0]}/run`,
							body,
							{ force },
						) as IJob;
					}

					if (additionalFields.timeout) {
						responseData = await cortexApiRequest.call(
							this,
							'GET',
							`/job/${responseData.id}/waitreport`,
							{},
							{ atMost: `${additionalFields.timeout}second` },
						);
					}
				}
			}

			if (resource === 'job') {
				//https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#get-details-1
				if (operation === 'get') {

					const jobId = this.getNodeParameter('jobId', i) as string;

					responseData = await cortexApiRequest.call(
						this,
						'GET',
						`/job/${jobId}`,
					);
				}
				//https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#get-details-and-report
				if (operation === 'report') {

					const jobId = this.getNodeParameter('jobId', i) as string;

					responseData = await cortexApiRequest.call(
						this,
						'GET',
						`/job/${jobId}/report`,
					);
				}
			}

			if (resource === 'responder') {
				if (operation === 'execute') {
					const responderId = (this.getNodeParameter('responder', i) as string).split('::')[0];

					const dataType = this.getNodeParameter('dataType', i) as string;

					const entityJson = JSON.parse(this.getNodeParameter('objectData', i) as string);

					const body: IDataObject = {
						responderId,
						label: getEntityLabel(entityJson),
						dataType: `thehive:${dataType}`,
						data: entityJson,
						tlp: entityJson.tlp,
						pap: entityJson.pap,
						message: entityJson.message || '',
						parameters:[],
					};

					responseData = await cortexApiRequest.call(
						this,
						'POST',
						`/responder/${responderId}/run`,
						body,
					) as IJob;
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
