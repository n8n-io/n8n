import type { IExecuteFunctions } from 'n8n-core';

import { cortexApiRequest, getEntityLabel, prepareParameters, splitTags } from './GenericFunctions';

import { analyzerFields, analyzersOperations } from './AnalyzerDescriptions';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { responderFields, respondersOperations } from './ResponderDescription';

import { jobFields, jobOperations } from './JobDescription';

import upperFirst from 'lodash.upperfirst';

import type { IJob } from './AnalyzerInterface';

import { createHash } from 'crypto';

import * as changeCase from 'change-case';

export class Cortex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortex',
		name: 'cortex',
		icon: 'file:cortex.svg',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]+ ": " + $parameter["resource"]}}',
		version: 1,
		description: 'Apply the Cortex analyzer/responder on the given entity',
		defaults: {
			name: 'Cortex',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analyzer',
						value: 'analyzer',
					},
					{
						name: 'Job',
						value: 'job',
					},
					{
						name: 'Responder',
						value: 'responder',
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
			...jobFields,
		],
	};

	methods = {
		loadOptions: {
			async loadActiveAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the enabled analyzers from instance
				const requestResult = await cortexApiRequest.call(
					this,
					'POST',
					'/analyzer/_search?range=all',
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
				const requestResult = await cortexApiRequest.call(this, 'GET', '/responder');

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
					returnData.push({
						name: upperFirst(dataType as string),
						value: dataType as string,
					});
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
					returnData.push({
						value: (dataType as string).split(':')[1],
						name: changeCase.capitalCase((dataType as string).split(':')[1]),
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'analyzer') {
					//https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#run
					if (operation === 'execute') {
						let force = false;

						const analyzer = this.getNodeParameter('analyzer', i) as string;

						const observableType = this.getNodeParameter('observableType', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

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
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

							if (item.binary[binaryPropertyName] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`Item has no binary property called "${binaryPropertyName}"`,
									{ itemIndex: i },
								);
							}

							const fileBufferData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

							const options = {
								formData: {
									data: {
										value: fileBufferData,
										options: {
											contentType: item.binary[binaryPropertyName].mimeType,
											filename: item.binary[binaryPropertyName].fileName,
										},
									},
									_json: JSON.stringify({
										dataType: observableType,
										tlp,
									}),
								},
							};

							responseData = (await cortexApiRequest.call(
								this,
								'POST',
								`/analyzer/${analyzer.split('::')[0]}/run`,
								{},
								{ force },
								'',
								options,
							)) as IJob;

							continue;
						} else {
							const observableValue = this.getNodeParameter('observableValue', i) as string;

							body.data = observableValue;

							responseData = (await cortexApiRequest.call(
								this,
								'POST',
								`/analyzer/${analyzer.split('::')[0]}/run`,
								body,
								{ force },
							)) as IJob;
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

						responseData = await cortexApiRequest.call(this, 'GET', `/job/${jobId}`);
					}
					//https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#get-details-and-report
					if (operation === 'report') {
						const jobId = this.getNodeParameter('jobId', i) as string;

						responseData = await cortexApiRequest.call(this, 'GET', `/job/${jobId}/report`);
					}
				}

				if (resource === 'responder') {
					if (operation === 'execute') {
						const responderId = (this.getNodeParameter('responder', i) as string).split('::')[0];

						const entityType = this.getNodeParameter('entityType', i) as string;

						const isJSON = this.getNodeParameter('jsonObject', i) as boolean;
						let body: IDataObject;

						if (isJSON) {
							const entityJson = JSON.parse(this.getNodeParameter('objectData', i) as string);

							body = {
								responderId,
								label: getEntityLabel(entityJson),
								dataType: `thehive:${entityType}`,
								data: entityJson,
								tlp: entityJson.tlp || 2,
								pap: entityJson.pap || 2,
								message: entityJson.message || '',
								parameters: [],
							};
						} else {
							const values = (this.getNodeParameter('parameters', i) as IDataObject)
								.values as IDataObject;

							body = {
								responderId,
								dataType: `thehive:${entityType}`,
								data: {
									_type: entityType,
									...prepareParameters(values),
								},
							};
							if (entityType === 'alert') {
								// deal with alert artifacts
								const artifacts = (body.data as IDataObject).artifacts as IDataObject;

								if (artifacts) {
									const artifactValues = artifacts.artifactValues as IDataObject[];

									if (artifactValues) {
										const artifactData = [];

										for (const artifactvalue of artifactValues) {
											const element: IDataObject = {};

											element.message = artifactvalue.message as string;

											element.tags = splitTags(artifactvalue.tags as string);

											element.dataType = artifactvalue.dataType as string;

											element.data = artifactvalue.data as string;

											if (artifactvalue.dataType === 'file') {
												const item = items[i];

												if (item.binary === undefined) {
													throw new NodeOperationError(
														this.getNode(),
														'No binary data exists on item!',
														{ itemIndex: i },
													);
												}

												const binaryPropertyName = artifactvalue.binaryProperty as string;

												if (item.binary[binaryPropertyName] === undefined) {
													throw new NodeOperationError(
														this.getNode(),
														`Item has no binary property called "${binaryPropertyName}"`,
														{ itemIndex: i },
													);
												}

												const binaryData = item.binary[binaryPropertyName];

												element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
											}

											artifactData.push(element);
										}

										(body.data as IDataObject).artifacts = artifactData;
									}
								}
							}
							if (entityType === 'case_artifact') {
								// deal with file observable

								if ((body.data as IDataObject).dataType === 'file') {
									const item = items[i];

									if (item.binary === undefined) {
										throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
											itemIndex: i,
										});
									}

									const binaryPropertyName = (body.data as IDataObject)
										.binaryPropertyName as string;
									if (item.binary[binaryPropertyName] === undefined) {
										throw new NodeOperationError(
											this.getNode(),
											`Item has no binary property called "${binaryPropertyName}"`,
											{ itemIndex: i },
										);
									}

									const fileBufferData = await this.helpers.getBinaryDataBuffer(
										i,
										binaryPropertyName,
									);
									const sha256 = createHash('sha256').update(fileBufferData).digest('hex');

									(body.data as IDataObject).attachment = {
										name: item.binary[binaryPropertyName].fileName,
										hashes: [
											sha256,
											createHash('sha1').update(fileBufferData).digest('hex'),
											createHash('md5').update(fileBufferData).digest('hex'),
										],
										size: fileBufferData.byteLength,
										contentType: item.binary[binaryPropertyName].mimeType,
										id: sha256,
									};

									delete (body.data as IDataObject).binaryPropertyName;
								}
							}
							// add the job label after getting all entity attributes
							body = {
								label: getEntityLabel(body.data as IDataObject),
								...body,
							};
						}
						responseData = (await cortexApiRequest.call(
							this,
							'POST',
							`/responder/${responderId}/run`,
							body,
						)) as IJob;
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
