import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { alertFields, alertOperations } from './descriptions/AlertDescription';

import { observableFields, observableOperations } from './descriptions/ObservableDescription';

import { caseFields, caseOperations } from './descriptions/CaseDescription';

import { taskFields, taskOperations } from './descriptions/TaskDescription';

import { logFields, logOperations } from './descriptions/LogDescription';

import { Buffer } from 'buffer';

import { And, Between, ContainsString, Eq, Id, In, IQueryObject, Parent } from './QueryFunctions';

import {
	buildCustomFieldSearch,
	mapResource,
	prepareCustomFields,
	prepareOptional,
	prepareRangeQuery,
	prepareSortQuery,
	splitTags,
	theHiveApiRequest,
} from './GenericFunctions';

export class TheHive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TheHive',
		name: 'theHive',
		icon: 'file:thehive.svg',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
		version: 1,
		description: 'Consume TheHive API',
		defaults: {
			name: 'TheHive',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'theHiveApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'Alert',
						value: 'alert',
					},
					{
						name: 'Case',
						value: 'case',
					},
					{
						name: 'Log',
						value: 'log',
					},
					{
						name: 'Observable',
						value: 'observable',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'alert',
			},
			// Alert
			...alertOperations,
			...alertFields,
			// Observable
			...observableOperations,
			...observableFields,
			// Case
			...caseOperations,
			...caseFields,
			// Task
			...taskOperations,
			...taskFields,
			// Log
			...logOperations,
			...logFields,
		],
	};
	methods = {
		loadOptions: {
			async loadResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the analyzers from instance
				const resource = mapResource(this.getNodeParameter('resource') as string);
				const resourceId = this.getNodeParameter('id');
				const endpoint = `/connector/cortex/responder/${resource}/${resourceId}`;

				const responders = await theHiveApiRequest.call(this, 'GET', endpoint as string);

				const returnData: INodePropertyOptions[] = [];

				for (const responder of responders) {
					returnData.push({
						name: responder.name as string,
						value: responder.id,
						description: responder.description as string,
					});
				}
				return returnData;
			},

			async loadAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the analyzers from instance
				const dataType = this.getNodeParameter('dataType') as string;
				const endpoint = `/connector/cortex/analyzer/type/${dataType}`;
				const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint as string);
				const returnData: INodePropertyOptions[] = [];

				for (const analyzer of requestResult) {
					for (const cortexId of analyzer.cortexIds) {
						returnData.push({
							name: `[${cortexId}] ${analyzer.name}`,
							value: `${analyzer.id as string}::${cortexId as string}`,
							description: analyzer.description as string,
						});
					}
				}
				return returnData;
			},
			async loadCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('theHiveApi');
				const version = credentials.apiVersion;
				const endpoint = version === 'v1' ? '/customField' : '/list/custom_fields';

				const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint as string);

				const returnData: INodePropertyOptions[] = [];

				// Convert TheHive3 response to the same format as TheHive 4
				const customFields =
					version === 'v1'
						? requestResult
						: Object.keys(requestResult).map((key) => requestResult[key]);

				for (const field of customFields) {
					returnData.push({
						name: `${field.name}: ${field.reference}`,
						value: field.reference,
						description: `${field.type}: ${field.description}`,
					} as INodePropertyOptions);
				}

				return returnData;
			},
			async loadObservableOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// if v1 is not used we remove 'count' option
				const version = (await this.getCredentials('theHiveApi')).apiVersion;

				const options = [
					...(version === 'v1'
						? [{ name: 'Count', value: 'count', description: 'Count observables' }]
						: []),
					{ name: 'Create', value: 'create', description: 'Create observable' },
					{
						name: 'Execute Analyzer',
						value: 'executeAnalyzer',
						description: 'Execute an responder on selected observable',
					},
					{
						name: 'Execute Responder',
						value: 'executeResponder',
						description: 'Execute a responder on selected observable',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all observables of a specific case',
					},
					{ name: 'Get', value: 'get', description: 'Get a single observable' },
					{ name: 'Search', value: 'search', description: 'Search observables' },
					{ name: 'Update', value: 'update', description: 'Update observable' },
				];
				return options;
			},
			async loadObservableTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const version = (await this.getCredentials('theHiveApi')).apiVersion;
				const endpoint =
					version === 'v1' ? '/observable/type?range=all' : '/list/list_artifactDataType';

				const dataTypes = await theHiveApiRequest.call(this, 'GET', endpoint as string);

				let returnData: INodePropertyOptions[] = [];

				if (version === 'v1') {
					returnData = dataTypes.map((dataType: IDataObject) => {
						return {
							name: dataType.name as string,
							value: dataType.name as string,
						};
					});
				} else {
					returnData = Object.keys(dataTypes).map((key) => {
						const dataType = dataTypes[key] as string;

						return {
							name: dataType,
							value: dataType,
						};
					});
				}

				// Sort the array by option name
				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			async loadTaskOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('theHiveApi');
				const version = credentials.apiVersion;
				const options = [
					...(version === 'v1'
						? [{ name: 'Count', value: 'count', description: 'Count tasks' }]
						: []),
					{ name: 'Create', value: 'create', description: 'Create a task' },
					{
						name: 'Execute Responder',
						value: 'executeResponder',
						description: 'Execute a responder on the specified task',
					},
					{ name: 'Get All', value: 'getAll', description: 'Get all asks of a specific case' },
					{ name: 'Get', value: 'get', description: 'Get a single task' },
					{ name: 'Search', value: 'search', description: 'Search tasks' },
					{ name: 'Update', value: 'update', description: 'Update a task' },
				];
				return options;
			},
			async loadAlertOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('theHiveApi');
				const version = credentials.apiVersion;
				const options = [
					...(version === 'v1'
						? [{ name: 'Count', value: 'count', description: 'Count alerts' }]
						: []),
					{ name: 'Create', value: 'create', description: 'Create alert' },
					{
						name: 'Execute Responder',
						value: 'executeResponder',
						description: 'Execute a responder on the specified alert',
					},
					{ name: 'Get', value: 'get', description: 'Get an alert' },
					{ name: 'Get All', value: 'getAll', description: 'Get all alerts' },
					{ name: 'Mark as Read', value: 'markAsRead', description: 'Mark the alert as read' },
					{
						name: 'Mark as Unread',
						value: 'markAsUnread',
						description: 'Mark the alert as unread',
					},
					{ name: 'Merge', value: 'merge', description: 'Merge alert into an existing case' },
					{ name: 'Promote', value: 'promote', description: 'Promote an alert into a case' },
					{ name: 'Update', value: 'update', description: 'Update alert' },
				];
				return options;
			},
			async loadCaseOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('theHiveApi');
				const version = credentials.apiVersion;
				const options = [
					...(version === 'v1'
						? [{ name: 'Count', value: 'count', description: 'Count a case' }]
						: []),
					{ name: 'Create', value: 'create', description: 'Create a case' },
					{
						name: 'Execute Responder',
						value: 'executeResponder',
						description: 'Execute a responder on the specified case',
					},
					{ name: 'Get All', value: 'getAll', description: 'Get all cases' },
					{ name: 'Get', value: 'get', description: 'Get a single case' },
					{ name: 'Update', value: 'update', description: 'Update a case' },
				];
				return options;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'alert') {
					if (operation === 'count') {
						const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
						const countQueryAttributs: any = prepareOptional(filters); // tslint:disable-line:no-any

						const _countSearchQuery: IQueryObject = And();

						if ('customFieldsUi' in filters) {
							const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
							const searchQueries = buildCustomFieldSearch(customFields);
							(_countSearchQuery['_and'] as IQueryObject[]).push(...searchQueries);
						}

						for (const key of Object.keys(countQueryAttributs)) {
							if (key === 'tags') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									In(key, countQueryAttributs[key] as string[]),
								);
							} else if (key === 'description' || key === 'title') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, countQueryAttributs[key] as string),
								);
							} else {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									Eq(key, countQueryAttributs[key] as string),
								);
							}
						}

						const body = {
							query: [
								{
									_name: 'listAlert',
								},
								{
									_name: 'filter',
									_and: _countSearchQuery['_and'],
								},
							],
						};

						body['query'].push({
							_name: 'count',
						});

						qs.name = 'count-Alert';

						responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

						responseData = { count: responseData };
					}

					if (operation === 'create') {
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as INodeParameters;
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						const customFields = await prepareCustomFields.call(
							this,
							additionalFields,
							jsonParameters,
						);
						const body: IDataObject = {
							title: this.getNodeParameter('title', i),
							description: this.getNodeParameter('description', i),
							severity: this.getNodeParameter('severity', i),
							date: Date.parse(this.getNodeParameter('date', i) as string),
							tags: splitTags(this.getNodeParameter('tags', i) as string),
							tlp: this.getNodeParameter('tlp', i),
							status: this.getNodeParameter('status', i),
							type: this.getNodeParameter('type', i),
							source: this.getNodeParameter('source', i),
							sourceRef: this.getNodeParameter('sourceRef', i),
							follow: this.getNodeParameter('follow', i, true),
							customFields,
							...prepareOptional(additionalFields),
						};

						const artifactUi = this.getNodeParameter('artifactUi', i) as IDataObject;

						if (artifactUi) {
							const artifactValues = (artifactUi as IDataObject).artifactValues as IDataObject[];

							if (artifactValues) {
								const artifactData = [];

								for (const artifactvalue of artifactValues) {
									const element: IDataObject = {};

									element.message = artifactvalue.message as string;

									element.tags = (artifactvalue.tags as string).split(',') as string[];

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
												`No binary data property '${binaryPropertyName}' does not exists on item!`,
												{ itemIndex: i },
											);
										}

										const binaryData = item.binary[binaryPropertyName] as IBinaryData;

										element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
									}

									artifactData.push(element);
								}
								body.artifacts = artifactData;
							}
						}

						responseData = await theHiveApiRequest.call(this, 'POST', '/alert' as string, body);
					}

					/*
						Execute responder feature differs from Cortex execute responder
						if it doesn't interfere with n8n standards then we should keep it
					*/

					if (operation === 'executeResponder') {
						const alertId = this.getNodeParameter('id', i);
						const responderId = this.getNodeParameter('responder', i) as string;
						let body: IDataObject;
						let response;
						responseData = [];
						body = {
							responderId,
							objectId: alertId,
							objectType: 'alert',
						};
						response = await theHiveApiRequest.call(
							this,
							'POST',
							'/connector/cortex/action' as string,
							body,
						);
						body = {
							query: [
								{
									_name: 'listAction',
								},
								{
									_name: 'filter',
									_and: [
										{
											_field: 'cortexId',
											_value: response.cortexId,
										},
										{
											_field: 'objectId',
											_value: response.objectId,
										},
										{
											_field: 'startDate',
											_value: response.startDate,
										},
									],
								},
							],
						};
						qs.name = 'log-actions';
						do {
							response = await theHiveApiRequest.call(this, 'POST', `/v1/query`, body, qs);
						} while (response.status === 'Waiting' || response.status === 'InProgress');

						responseData = response;
					}

					if (operation === 'get') {
						const alertId = this.getNodeParameter('id', i) as string;

						responseData = await theHiveApiRequest.call(this, 'GET', `/alert/${alertId}`, {});
					}
					if (operation === 'getAll') {
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
						const queryAttributs: any = prepareOptional(filters); // tslint:disable-line:no-any
						const options = this.getNodeParameter('options', i) as IDataObject;

						const _searchQuery: IQueryObject = And();

						if ('customFieldsUi' in filters) {
							const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
							const searchQueries = buildCustomFieldSearch(customFields);
							(_searchQuery['_and'] as IQueryObject[]).push(...searchQueries);
						}

						for (const key of Object.keys(queryAttributs)) {
							if (key === 'tags') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									In(key, queryAttributs[key] as string[]),
								);
							} else if (key === 'description' || key === 'title') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, queryAttributs[key] as string),
								);
							} else {
								(_searchQuery['_and'] as IQueryObject[]).push(
									Eq(key, queryAttributs[key] as string),
								);
							}
						}

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'listAlert',
									},
									{
										_name: 'filter',
										_and: _searchQuery['_and'],
									},
								],
							};

							//@ts-ignore
							prepareSortQuery(options.sort, body);

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'alerts';
						} else {
							method = 'POST';

							endpoint = '/alert/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = _searchQuery;

							Object.assign(qs, prepareOptional(options));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'markAsRead') {
						const alertId = this.getNodeParameter('id', i) as string;

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/alert/${alertId}/markAsRead`,
						);
					}

					if (operation === 'markAsUnread') {
						const alertId = this.getNodeParameter('id', i) as string;

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/alert/${alertId}/markAsUnread`,
						);
					}

					if (operation === 'merge') {
						const alertId = this.getNodeParameter('id', i) as string;

						const caseId = this.getNodeParameter('caseId', i) as string;

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/alert/${alertId}/merge/${caseId}`,
							{},
						);
					}

					if (operation === 'promote') {
						const alertId = this.getNodeParameter('id', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {};

						Object.assign(body, additionalFields);

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/alert/${alertId}/createCase`,
							body,
						);
					}

					if (operation === 'update') {
						const alertId = this.getNodeParameter('id', i) as string;
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);

						const artifactUi = updateFields.artifactUi as IDataObject;

						delete updateFields.artifactUi;

						const body: IDataObject = {
							customFields,
						};

						Object.assign(body, updateFields);

						if (artifactUi) {
							const artifactValues = (artifactUi as IDataObject).artifactValues as IDataObject[];

							if (artifactValues) {
								const artifactData = [];

								for (const artifactvalue of artifactValues) {
									const element: IDataObject = {};

									element.message = artifactvalue.message as string;

									element.tags = (artifactvalue.tags as string).split(',') as string[];

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
												`No binary data property '${binaryPropertyName}' does not exists on item!`,
												{ itemIndex: i },
											);
										}

										const binaryData = item.binary[binaryPropertyName] as IBinaryData;

										element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
									}

									artifactData.push(element);
								}
								body.artifacts = artifactData;
							}
						}

						responseData = await theHiveApiRequest.call(
							this,
							'PATCH',
							`/alert/${alertId}` as string,
							body,
						);
					}
				}

				if (resource === 'observable') {
					if (operation === 'count') {
						// tslint:disable-next-line:no-any
						const countQueryAttributs: any = prepareOptional(
							this.getNodeParameter('filters', i, {}) as INodeParameters,
						);
						const _countSearchQuery: IQueryObject = And();

						for (const key of Object.keys(countQueryAttributs)) {
							if (key === 'dataType' || key === 'tags') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									In(key, countQueryAttributs[key] as string[]),
								);
							} else if (key === 'description' || key === 'keywork' || key === 'message') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, countQueryAttributs[key] as string),
								);
							} else if (key === 'range') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									Between(
										'startDate',
										countQueryAttributs['range']['dateRange']['fromDate'],
										countQueryAttributs['range']['dateRange']['toDate'],
									),
								);
							} else {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									Eq(key, countQueryAttributs[key] as string),
								);
							}
						}

						const body = {
							query: [
								{
									_name: 'listObservable',
								},
								{
									_name: 'filter',
									_and: _countSearchQuery['_and'],
								},
							],
						};

						body['query'].push({
							_name: 'count',
						});

						qs.name = 'count-observables';

						responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

						responseData = { count: responseData };
					}

					if (operation === 'executeAnalyzer') {
						const observableId = this.getNodeParameter('id', i);
						const analyzers = (this.getNodeParameter('analyzers', i) as string[]).map(
							(analyzer) => {
								const parts = analyzer.split('::');
								return {
									analyzerId: parts[0],
									cortexId: parts[1],
								};
							},
						);
						let response: any; // tslint:disable-line:no-any
						let body: IDataObject;
						responseData = [];
						for (const analyzer of analyzers) {
							body = {
								...analyzer,
								artifactId: observableId,
							};
							// execute the analyzer
							response = await theHiveApiRequest.call(
								this,
								'POST',
								'/connector/cortex/job' as string,
								body,
								qs,
							);
							const jobId = response.id;
							qs.name = 'observable-jobs';
							// query the job result (including the report)
							do {
								responseData = await theHiveApiRequest.call(
									this,
									'GET',
									`/connector/cortex/job/${jobId}`,
									body,
									qs,
								);
							} while (responseData.status === 'Waiting' || responseData.status === 'InProgress');
						}
					}

					if (operation === 'executeResponder') {
						const observableId = this.getNodeParameter('id', i);
						const responderId = this.getNodeParameter('responder', i) as string;
						let body: IDataObject;
						let response;
						responseData = [];
						body = {
							responderId,
							objectId: observableId,
							objectType: 'case_artifact',
						};
						response = await theHiveApiRequest.call(
							this,
							'POST',
							'/connector/cortex/action' as string,
							body,
						);
						body = {
							query: [
								{
									_name: 'listAction',
								},
								{
									_name: 'filter',
									_and: [
										{
											_field: 'cortexId',
											_value: response.cortexId,
										},
										{
											_field: 'objectId',
											_value: response.objectId,
										},
										{
											_field: 'startDate',
											_value: response.startDate,
										},
									],
								},
							],
						};
						qs.name = 'log-actions';
						do {
							response = await theHiveApiRequest.call(this, 'POST', `/v1/query`, body, qs);
						} while (response.status === 'Waiting' || response.status === 'InProgress');

						responseData = response;
					}

					if (operation === 'create') {
						const caseId = this.getNodeParameter('caseId', i);

						let body: IDataObject = {
							dataType: this.getNodeParameter('dataType', i) as string,
							message: this.getNodeParameter('message', i) as string,
							startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
							tlp: this.getNodeParameter('tlp', i) as number,
							ioc: this.getNodeParameter('ioc', i) as boolean,
							sighted: this.getNodeParameter('sighted', i) as boolean,
							status: this.getNodeParameter('status', i) as string,
							...prepareOptional(this.getNodeParameter('options', i, {}) as INodeParameters),
						};

						let options: IDataObject = {};

						if (body.dataType === 'file') {
							const item = items[i];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const binaryPropertyName = this.getNodeParameter('binaryProperty', i) as string;

							if (item.binary[binaryPropertyName] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property '${binaryPropertyName}' does not exists on item!`,
									{ itemIndex: i },
								);
							}

							const binaryData = item.binary[binaryPropertyName] as IBinaryData;
							const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

							options = {
								formData: {
									attachment: {
										value: dataBuffer,
										options: {
											contentType: binaryData.mimeType,
											filename: binaryData.fileName,
										},
									},
									_json: JSON.stringify(body),
								},
							};
							body = {};
						} else {
							body.data = this.getNodeParameter('data', i) as string;
						}

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/case/${caseId}/artifact` as string,
							body,
							qs,
							'',
							options,
						);
					}

					if (operation === 'get') {
						const observableId = this.getNodeParameter('id', i) as string;

						const credentials = await this.getCredentials('theHiveApi');

						const version = credentials.apiVersion;

						let endpoint;

						let method;

						let body: IDataObject = {};

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getObservable',
										idOrName: observableId,
									},
								],
							};

							qs.name = `get-observable-${observableId}`;
						} else {
							method = 'GET';

							endpoint = `/case/artifact/${observableId}`;
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'getAll') {
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						const options = this.getNodeParameter('options', i) as IDataObject;

						const caseId = this.getNodeParameter('caseId', i);

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getCase',
										idOrName: caseId,
									},
									{
										_name: 'observables',
									},
								],
							};

							//@ts-ignore
							prepareSortQuery(options.sort, body);

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'observables';
						} else {
							method = 'POST';

							endpoint = '/case/artifact/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = Parent('case', Id(caseId as string));

							Object.assign(qs, prepareOptional(options));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'search') {
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						// tslint:disable-next-line:no-any
						const queryAttributs: any = prepareOptional(
							this.getNodeParameter('filters', i, {}) as INodeParameters,
						);

						const _searchQuery: IQueryObject = And();

						const options = this.getNodeParameter('options', i) as IDataObject;

						for (const key of Object.keys(queryAttributs)) {
							if (key === 'dataType' || key === 'tags') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									In(key, queryAttributs[key] as string[]),
								);
							} else if (key === 'description' || key === 'keywork' || key === 'message') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, queryAttributs[key] as string),
								);
							} else if (key === 'range') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									Between(
										'startDate',
										queryAttributs['range']['dateRange']['fromDate'],
										queryAttributs['range']['dateRange']['toDate'],
									),
								);
							} else {
								(_searchQuery['_and'] as IQueryObject[]).push(
									Eq(key, queryAttributs[key] as string),
								);
							}
						}

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'listObservable',
									},
									{
										_name: 'filter',
										_and: _searchQuery['_and'],
									},
								],
							};

							//@ts-ignore
							prepareSortQuery(options.sort, body);

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'observables';
						} else {
							method = 'POST';

							endpoint = '/case/artifact/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = _searchQuery;

							Object.assign(qs, prepareOptional(options));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;

						const body: IDataObject = {
							...prepareOptional(this.getNodeParameter('updateFields', i, {}) as INodeParameters),
						};

						responseData = await theHiveApiRequest.call(
							this,
							'PATCH',
							`/case/artifact/${id}` as string,
							body,
							qs,
						);

						responseData = { success: true };
					}
				}

				if (resource === 'case') {
					if (operation === 'count') {
						const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
						const countQueryAttributs: any = prepareOptional(filters); // tslint:disable-line:no-any

						const _countSearchQuery: IQueryObject = And();

						if ('customFieldsUi' in filters) {
							const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
							const searchQueries = buildCustomFieldSearch(customFields);
							(_countSearchQuery['_and'] as IQueryObject[]).push(...searchQueries);
						}

						for (const key of Object.keys(countQueryAttributs)) {
							if (key === 'tags') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									In(key, countQueryAttributs[key] as string[]),
								);
							} else if (key === 'description' || key === 'summary' || key === 'title') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, countQueryAttributs[key] as string),
								);
							} else {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									Eq(key, countQueryAttributs[key] as string),
								);
							}
						}

						const body = {
							query: [
								{
									_name: 'listCase',
								},
								{
									_name: 'filter',
									_and: _countSearchQuery['_and'],
								},
							],
						};

						body['query'].push({
							_name: 'count',
						});

						qs.name = 'count-cases';

						responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

						responseData = { count: responseData };
					}

					if (operation === 'executeResponder') {
						const caseId = this.getNodeParameter('id', i);
						const responderId = this.getNodeParameter('responder', i) as string;
						let body: IDataObject;
						let response;
						responseData = [];
						body = {
							responderId,
							objectId: caseId,
							objectType: 'case',
						};
						response = await theHiveApiRequest.call(
							this,
							'POST',
							'/connector/cortex/action' as string,
							body,
						);
						body = {
							query: [
								{
									_name: 'listAction',
								},
								{
									_name: 'filter',
									_and: [
										{
											_field: 'cortexId',
											_value: response.cortexId,
										},
										{
											_field: 'objectId',
											_value: response.objectId,
										},
										{
											_field: 'startDate',
											_value: response.startDate,
										},
									],
								},
							],
						};
						qs.name = 'log-actions';
						do {
							response = await theHiveApiRequest.call(this, 'POST', `/v1/query`, body, qs);
						} while (response.status === 'Waiting' || response.status === 'InProgress');

						responseData = response;
					}

					if (operation === 'create') {
						const options = this.getNodeParameter('options', i, {}) as INodeParameters;
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
						const customFields = await prepareCustomFields.call(this, options, jsonParameters);

						const body: IDataObject = {
							title: this.getNodeParameter('title', i),
							description: this.getNodeParameter('description', i),
							severity: this.getNodeParameter('severity', i),
							startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
							owner: this.getNodeParameter('owner', i),
							flag: this.getNodeParameter('flag', i),
							tlp: this.getNodeParameter('tlp', i),
							tags: splitTags(this.getNodeParameter('tags', i) as string),
							customFields,
							...prepareOptional(options),
						};

						responseData = await theHiveApiRequest.call(this, 'POST', '/case' as string, body);
					}

					if (operation === 'get') {
						const caseId = this.getNodeParameter('id', i) as string;

						const credentials = await this.getCredentials('theHiveApi');

						const version = credentials.apiVersion;

						let endpoint;

						let method;

						let body: IDataObject = {};

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getCase',
										idOrName: caseId,
									},
								],
							};

							qs.name = `get-case-${caseId}`;
						} else {
							method = 'GET';

							endpoint = `/case/${caseId}`;
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'getAll') {
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
						const queryAttributs: any = prepareOptional(filters); // tslint:disable-line:no-any

						const _searchQuery: IQueryObject = And();

						const options = this.getNodeParameter('options', i) as IDataObject;

						if ('customFieldsUi' in filters) {
							const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
							const searchQueries = buildCustomFieldSearch(customFields);
							(_searchQuery['_and'] as IQueryObject[]).push(...searchQueries);
						}

						for (const key of Object.keys(queryAttributs)) {
							if (key === 'tags') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									In(key, queryAttributs[key] as string[]),
								);
							} else if (key === 'description' || key === 'summary' || key === 'title') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, queryAttributs[key] as string),
								);
							} else {
								(_searchQuery['_and'] as IQueryObject[]).push(
									Eq(key, queryAttributs[key] as string),
								);
							}
						}

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'listCase',
									},
									{
										_name: 'filter',
										_and: _searchQuery['_and'],
									},
								],
							};

							//@ts-ignore
							prepareSortQuery(options.sort, body);

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'cases';
						} else {
							method = 'POST';

							endpoint = '/case/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = _searchQuery;

							Object.assign(qs, prepareOptional(options));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i, {}) as INodeParameters;
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);

						const body: IDataObject = {
							customFields,
							...prepareOptional(updateFields),
						};

						responseData = await theHiveApiRequest.call(
							this,
							'PATCH',
							`/case/${id}` as string,
							body,
						);
					}
				}

				if (resource === 'task') {
					if (operation === 'count') {
						// tslint:disable-next-line:no-any
						const countQueryAttributs: any = prepareOptional(
							this.getNodeParameter('filters', i, {}) as INodeParameters,
						);

						const _countSearchQuery: IQueryObject = And();

						for (const key of Object.keys(countQueryAttributs)) {
							if (key === 'title' || key === 'description') {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, countQueryAttributs[key] as string),
								);
							} else {
								(_countSearchQuery['_and'] as IQueryObject[]).push(
									Eq(key, countQueryAttributs[key] as string),
								);
							}
						}

						const body = {
							query: [
								{
									_name: 'listTask',
								},
								{
									_name: 'filter',
									_and: _countSearchQuery['_and'],
								},
							],
						};

						body['query'].push({
							_name: 'count',
						});

						qs.name = 'count-tasks';

						responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

						responseData = { count: responseData };
					}

					if (operation === 'create') {
						const caseId = this.getNodeParameter('caseId', i) as string;

						const body: IDataObject = {
							title: this.getNodeParameter('title', i) as string,
							status: this.getNodeParameter('status', i) as string,
							flag: this.getNodeParameter('flag', i),
							...prepareOptional(this.getNodeParameter('options', i, {}) as INodeParameters),
						};

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/case/${caseId}/task` as string,
							body,
						);
					}

					if (operation === 'executeResponder') {
						const taskId = this.getNodeParameter('id', i);
						const responderId = this.getNodeParameter('responder', i) as string;
						let body: IDataObject;
						let response;
						responseData = [];
						body = {
							responderId,
							objectId: taskId,
							objectType: 'case_task',
						};
						response = await theHiveApiRequest.call(
							this,
							'POST',
							'/connector/cortex/action' as string,
							body,
						);
						body = {
							query: [
								{
									_name: 'listAction',
								},
								{
									_name: 'filter',
									_and: [
										{
											_field: 'cortexId',
											_value: response.cortexId,
										},
										{
											_field: 'objectId',
											_value: response.objectId,
										},
										{
											_field: 'startDate',
											_value: response.startDate,
										},
									],
								},
							],
						};
						qs.name = 'task-actions';
						do {
							response = await theHiveApiRequest.call(this, 'POST', `/v1/query`, body, qs);
						} while (response.status === 'Waiting' || response.status === 'InProgress');

						responseData = response;
					}

					if (operation === 'get') {
						const taskId = this.getNodeParameter('id', i) as string;

						const credentials = await this.getCredentials('theHiveApi');

						const version = credentials.apiVersion;

						let endpoint;

						let method;

						let body: IDataObject = {};

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getTask',
										idOrName: taskId,
									},
								],
							};

							qs.name = `get-task-${taskId}`;
						} else {
							method = 'GET';

							endpoint = `/case/task/${taskId}`;
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'getAll') {
						// get all require a case id (it retursn all tasks for a specific case)
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						const caseId = this.getNodeParameter('caseId', i) as string;

						const options = this.getNodeParameter('options', i) as IDataObject;

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getCase',
										idOrName: caseId,
									},
									{
										_name: 'tasks',
									},
								],
							};

							//@ts-ignore
							prepareSortQuery(options.sort, body);

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'case-tasks';
						} else {
							method = 'POST';

							endpoint = '/case/task/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = And(Parent('case', Id(caseId)));

							Object.assign(qs, prepareOptional(options));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'search') {
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						// tslint:disable-next-line:no-any
						const queryAttributs: any = prepareOptional(
							this.getNodeParameter('filters', i, {}) as INodeParameters,
						);

						const _searchQuery: IQueryObject = And();

						const options = this.getNodeParameter('options', i) as IDataObject;

						for (const key of Object.keys(queryAttributs)) {
							if (key === 'title' || key === 'description') {
								(_searchQuery['_and'] as IQueryObject[]).push(
									ContainsString(key, queryAttributs[key] as string),
								);
							} else {
								(_searchQuery['_and'] as IQueryObject[]).push(
									Eq(key, queryAttributs[key] as string),
								);
							}
						}

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'listTask',
									},
									{
										_name: 'filter',
										_and: _searchQuery['_and'],
									},
								],
							};

							//@ts-ignore
							prepareSortQuery(options.sort, body);

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'tasks';
						} else {
							method = 'POST';

							endpoint = '/case/task/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = _searchQuery;

							Object.assign(qs, prepareOptional(options));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;

						const body: IDataObject = {
							...prepareOptional(this.getNodeParameter('updateFields', i, {}) as INodeParameters),
						};

						responseData = await theHiveApiRequest.call(
							this,
							'PATCH',
							`/case/task/${id}` as string,
							body,
						);
					}
				}

				if (resource === 'log') {
					if (operation === 'create') {
						const taskId = this.getNodeParameter('taskId', i) as string;

						let body: IDataObject = {
							message: this.getNodeParameter('message', i),
							startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
							status: this.getNodeParameter('status', i),
						};
						const optionals = this.getNodeParameter('options', i) as IDataObject;

						let options: IDataObject = {};

						if (optionals.attachementUi) {
							const attachmentValues = (optionals.attachementUi as IDataObject)
								.attachmentValues as IDataObject;

							if (attachmentValues) {
								const item = items[i];

								if (item.binary === undefined) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
										itemIndex: i,
									});
								}

								const binaryPropertyName = attachmentValues.binaryProperty as string;

								if (item.binary[binaryPropertyName] === undefined) {
									throw new NodeOperationError(
										this.getNode(),
										`No binary data property '${binaryPropertyName}' does not exists on item!`,
										{ itemIndex: i },
									);
								}

								const binaryData = item.binary[binaryPropertyName] as IBinaryData;
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

								options = {
									formData: {
										attachment: {
											value: dataBuffer,
											options: {
												contentType: binaryData.mimeType,
												filename: binaryData.fileName,
											},
										},
										_json: JSON.stringify(body),
									},
								};

								body = {};
							}
						}

						responseData = await theHiveApiRequest.call(
							this,
							'POST',
							`/case/task/${taskId}/log` as string,
							body,
							qs,
							'',
							options,
						);
					}

					if (operation === 'executeResponder') {
						const logId = this.getNodeParameter('id', i);
						const responderId = this.getNodeParameter('responder', i) as string;
						let body: IDataObject;
						let response;
						responseData = [];
						body = {
							responderId,
							objectId: logId,
							objectType: 'case_task_log',
						};
						response = await theHiveApiRequest.call(
							this,
							'POST',
							'/connector/cortex/action' as string,
							body,
						);
						body = {
							query: [
								{
									_name: 'listAction',
								},
								{
									_name: 'filter',
									_and: [
										{
											_field: 'cortexId',
											_value: response.cortexId,
										},
										{
											_field: 'objectId',
											_value: response.objectId,
										},
										{
											_field: 'startDate',
											_value: response.startDate,
										},
									],
								},
							],
						};
						qs.name = 'log-actions';
						do {
							response = await theHiveApiRequest.call(this, 'POST', `/v1/query`, body, qs);
						} while (response.status === 'Waiting' || response.status === 'InProgress');

						responseData = response;
					}

					if (operation === 'get') {
						const logId = this.getNodeParameter('id', i) as string;

						const credentials = await this.getCredentials('theHiveApi');

						const version = credentials.apiVersion;

						let endpoint;

						let method;

						let body: IDataObject = {};

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getLog',
										idOrName: logId,
									},
								],
							};

							qs.name = `get-log-${logId}`;
						} else {
							method = 'POST';

							endpoint = '/case/task/log/_search';

							body.query = { _id: logId };
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
					}

					if (operation === 'getAll') {
						const credentials = await this.getCredentials('theHiveApi');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const version = credentials.apiVersion;

						const taskId = this.getNodeParameter('taskId', i) as string;

						let endpoint;

						let method;

						let body: IDataObject = {};

						let limit = undefined;

						if (returnAll === false) {
							limit = this.getNodeParameter('limit', i) as number;
						}

						if (version === 'v1') {
							endpoint = '/v1/query';

							method = 'POST';

							body = {
								query: [
									{
										_name: 'getTask',
										idOrName: taskId,
									},
									{
										_name: 'logs',
									},
								],
							};

							if (limit !== undefined) {
								//@ts-ignore
								prepareRangeQuery(`0-${limit}`, body);
							}

							qs.name = 'case-task-logs';
						} else {
							method = 'POST';

							endpoint = '/case/task/log/_search';

							if (limit !== undefined) {
								qs.range = `0-${limit}`;
							}

							body.query = And(Parent('task', Id(taskId)));
						}

						responseData = await theHiveApiRequest.call(this, method, endpoint as string, body, qs);
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
