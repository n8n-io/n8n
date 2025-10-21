import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsApiRequestREST } from '../GenericFunctions';

export class AwsAthena implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Athena',
		name: 'awsAthena',
		icon: 'file:athena.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Query data in S3 using SQL with AWS Athena',
		defaults: {
			name: 'AWS Athena',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				noDataExpression: true,
				options: [
					{
						name: 'Start Query Execution',
						value: 'startQueryExecution',
						description: 'Execute a SQL query on data in S3',
						action: 'Start query execution',
					},
					{
						name: 'Get Query Execution',
						value: 'getQueryExecution',
						description: 'Get status and details of a query execution',
						action: 'Get query execution',
					},
					{
						name: 'Get Query Results',
						value: 'getQueryResults',
						description: 'Retrieve results of a completed query',
						action: 'Get query results',
					},
					{
						name: 'Create Named Query',
						value: 'createNamedQuery',
						description: 'Save a SQL query for reuse',
						action: 'Create named query',
					},
				],
				default: 'startQueryExecution',
			},
			// Start Query Execution
			{
				displayName: 'Query String',
				name: 'queryString',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['startQueryExecution', 'createNamedQuery'],
					},
				},
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				placeholder: 'SELECT * FROM my_table LIMIT 10',
				description: 'SQL query to execute',
			},
			{
				displayName: 'Database',
				name: 'database',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['startQueryExecution', 'createNamedQuery'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
				},
				default: '',
				required: true,
				description: 'Database to query',
			},
			{
				displayName: 'Output Location',
				name: 'outputLocation',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['startQueryExecution'],
					},
				},
				default: '',
				required: true,
				placeholder: 's3://my-bucket/athena-results/',
				description: 'S3 path for query results',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['startQueryExecution', 'createNamedQuery'],
					},
				},
				options: [
					{
						displayName: 'Work Group',
						name: 'workGroup',
						type: 'string',
						default: 'primary',
						description: 'Workgroup to use',
					},
					{
						displayName: 'Catalog',
						name: 'catalog',
						type: 'string',
						default: 'AwsDataCatalog',
						description: 'Data catalog',
					},
				],
			},
			// Get Query Execution
			{
				displayName: 'Query Execution ID',
				name: 'queryExecutionId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getQueryExecution', 'getQueryResults'],
					},
				},
				default: '',
				required: true,
				description: 'Query execution ID',
			},
			// Get Query Results
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getQueryResults'],
					},
				},
				default: true,
				description: 'Whether to wait for query to complete before retrieving results',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getQueryResults'],
					},
				},
				default: true,
				description: 'Whether to return all rows',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getQueryResults'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 100,
				description: 'Max number of rows to return',
			},
			// Create Named Query
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createNamedQuery'],
					},
				},
				default: '',
				required: true,
				description: 'Query name',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createNamedQuery'],
					},
				},
				default: '',
				description: 'Query description',
			},
		],
	};

	methods = {
		loadOptions: {
			async getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const data = await awsApiRequestREST.call(
						this,
						'athena',
						'POST',
						'/',
						JSON.stringify({ CatalogName: 'AwsDataCatalog' }),
						{
							'X-Amz-Target': 'AmazonAthena.ListDatabases',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					if (!data.DatabaseList) return [];

					return data.DatabaseList.map((db: any) => ({
						name: db.Name,
						value: db.Name,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (operation === 'startQueryExecution') {
					const queryString = this.getNodeParameter('queryString', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const outputLocation = this.getNodeParameter('outputLocation', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						QueryString: queryString,
						QueryExecutionContext: {
							Database: database,
							Catalog: additionalFields.catalog || 'AwsDataCatalog',
						},
						ResultConfiguration: {
							OutputLocation: outputLocation,
						},
					};

					if (additionalFields.workGroup) {
						body.WorkGroup = additionalFields.workGroup;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'athena',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AmazonAthena.StartQueryExecution',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'getQueryExecution') {
					const queryExecutionId = this.getNodeParameter('queryExecutionId', i) as string;

					const body = {
						QueryExecutionId: queryExecutionId,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'athena',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AmazonAthena.GetQueryExecution',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = responseData.QueryExecution || responseData;
				} else if (operation === 'getQueryResults') {
					const queryExecutionId = this.getNodeParameter('queryExecutionId', i) as string;
					const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (waitForCompletion) {
						// Poll until query completes
						let attempts = 0;
						const maxAttempts = 150; // 5 minutes with 2-second intervals
						let state = 'QUEUED';

						while (attempts < maxAttempts && !['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(state)) {
							const statusBody = {
								QueryExecutionId: queryExecutionId,
							};

							const statusResponse = await awsApiRequestREST.call(
								this,
								'athena',
								'POST',
								'/',
								JSON.stringify(statusBody),
								{
									'X-Amz-Target': 'AmazonAthena.GetQueryExecution',
									'Content-Type': 'application/x-amz-json-1.1',
								},
							);

							state = statusResponse.QueryExecution.Status.State;

							if (state === 'SUCCEEDED') {
								break;
							} else if (['FAILED', 'CANCELLED'].includes(state)) {
								throw new Error(
									`Query ${state}: ${statusResponse.QueryExecution.Status.StateChangeReason || 'Unknown error'}`,
								);
							}

							await new Promise((resolve) => setTimeout(resolve, 2000));
							attempts++;
						}

						if (attempts >= maxAttempts) {
							throw new Error('Query execution timeout after 5 minutes');
						}
					}

					const body: IDataObject = {
						QueryExecutionId: queryExecutionId,
					};

					if (!returnAll) {
						const maxResults = this.getNodeParameter('maxResults', i) as number;
						body.MaxResults = maxResults;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'athena',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AmazonAthena.GetQueryResults',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					// Transform results to array of objects
					if (responseData.ResultSet?.Rows && responseData.ResultSet.Rows.length > 0) {
						const rows = responseData.ResultSet.Rows;
						const headers = rows[0].Data.map((col: any) => col.VarCharValue);

						responseData = rows.slice(1).map((row: any) => {
							const obj: IDataObject = {};
							row.Data.forEach((col: any, index: number) => {
								obj[headers[index]] = col.VarCharValue;
							});
							return obj;
						});
					} else {
						responseData = [];
					}
				} else if (operation === 'createNamedQuery') {
					const name = this.getNodeParameter('name', i) as string;
					const description = this.getNodeParameter('description', i, '') as string;
					const database = this.getNodeParameter('database', i) as string;
					const queryString = this.getNodeParameter('queryString', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						Name: name,
						Database: database,
						QueryString: queryString,
					};

					if (description) {
						body.Description = description;
					}

					if (additionalFields.workGroup) {
						body.WorkGroup = additionalFields.workGroup;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'athena',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AmazonAthena.CreateNamedQuery',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
