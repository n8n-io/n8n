import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	GenericValue,
	IContextObject,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';

import {
	ClickHouse as ClickHouseClient
} from 'clickhouse';

import * as _ from 'lodash';

export class ClickHouse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ClickHouse',
		name: 'clickHouse',
		icon: 'file:clickhouse.svg',
		group: ['input'],
		version: 1,
		description: 'Query, insert and update data in ClickHouse',
		defaults: {
			name: 'ClickHouse',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clickHouse',
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
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an SQL query.',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database.',
					},
					{
						name: 'Update',
						value: 'update',
						description: `Update rows in database. Tables created with <b>ENGINE = MergeTree</b> , <b>ENGINE = Merge </b> and <b>ENGINE = Distributed</b> don't support this operation.`,
					},
				],
				default: 'insert',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: [
							'executeQuery',
						],
					},
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE id < 40',
				required: true,
				description: 'The SQL query to execute.',
			},


			// ----------------------------------
			//         insert
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to insert data to.',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'insert',
						],
					},
				},
				default: '',
				placeholder: 'id,name,description',
				required: true,
				description: 'Comma separated list of the properties which should used as columns for the new rows.',
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to update data in',
			},
			{
				displayName: 'Update Key',
				name: 'updateKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: 'id',
				required: true,
				description: 'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: '',
				placeholder: 'name,description',
				required: true,
				description: 'Comma separated list of the properties which should used as columns for rows to update.',
			},

		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			const credentials = await this.getCredentials('clickHouse');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			const clickHouseConnectionConfig = {
				url: `http://${credentials.host}`,
				port: credentials.port,
				debug: false,
				basicAuth: credentials.basicAuth ?
					{
						username: credentials.user,
						password: credentials.password,
					} :
					null,
				isUseGzip: false,
				format: 'json',
				raw: false,
				config: {
					database: credentials.database,
				},
			};

			const clickhouseClient = new ClickHouseClient(clickHouseConnectionConfig);

			const items = this.getInputData();
			const operation = this.getNodeParameter('operation', 0) as string;
			let responseData =  [];
			
			if (operation === 'executeQuery') {
				let queryResponse:IContextObject | IDataObject[];
				let queryResult:IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const query = this.getNodeParameter('query', i) as string;
					if (query) {
						queryResponse = await clickhouseClient.query(query).toPromise();

						if (queryResponse.error) {
							throw new Error(`ClickHouse Query Error, ${queryResponse.message}`);
						}

						queryResult = queryResult.concat(queryResponse);

					}
				}

				responseData = this.helpers.returnJsonArray(queryResult);

			} else if (operation === 'insert') {

				const table = this.getNodeParameter('table', 0) as string;
				const columnNode = this.getNodeParameter('columns', 0) as string;
				const columns: string[] = columnNode.split(',').map(column => column.trim());

				//find values to be inserted from previous input
				const insertValues = items.map(item => {
					const row: GenericValue[] = [];
					const itemKeys: string[] = Object.keys(item.json);
					for (const column of columns) {
						if (itemKeys.includes(column)) {
							row.push(item.json[column]);
						} else {
							row.push(null);
						}
					}

					return `(${row.map((rowItem: GenericValue) => `'${rowItem}'`).join(', ')})`;
					
				});

				// divide insert values into batches of 6000
				const insertValuesBatches: string[][] = _.chunk(insertValues, 6000);

				//generic insert clause for evenry batch
				const insertClause = `INSERT INTO ${table} (${columns.join(', ')}) VALUES`;

				//create query for batched values
				const batchQueries: string[] = insertValuesBatches.map((batch: string[]) => {
					const valuesCluase: string = batch.join(' ');
					return `${insertClause} ${valuesCluase}`;
				});

				//create promise for each batch
				const batchPromises = batchQueries.map((query: string) => {
					return clickhouseClient.query(query).toPromise();
				});

				const batchPromisesResult = await Promise.all(
					batchPromises,
				);


				responseData = this.helpers.returnJsonArray(batchPromisesResult as unknown as IDataObject[]);

			} else {
				const table = this.getNodeParameter('table', 0) as string;
				const columnNode = this.getNodeParameter('columns', 0) as string;
				const updateKey = this.getNodeParameter('updateKey', 0) as string;
				const columns: string[] = columnNode.split(',').map(column => column.trim()).filter(column => column !== updateKey);

				const updateQueries: string[] = items
					.filter(item => { //filter for items having updateKey
						return Object.keys(item.json).includes(updateKey);
					})
					.map(item => {  // create update query for filtered items
						const row: string[] = [];
						const itemKeys: string[] = Object.keys(item.json);
						for (const column of columns) {
							// update vales that are present in item.
							if (itemKeys.includes(column)) {
								row.push(`${column} = '${item.json[column]}'`);
							}
						}

						const updateQuery = `ALTER TABLE ${table} UPDATE ${row.join(', ')} WHERE ${updateKey} = '${item.json[updateKey]}'`;

						return updateQuery;
					});

				// create promise list for all queries
				const updateQueriesPromises = updateQueries.map((query: string) => {
					return clickhouseClient.query(query).toPromise();
				});

				const updateQueriesResult = await Promise.all(
					updateQueriesPromises,
				);

				responseData = this.helpers.returnJsonArray(updateQueriesResult as unknown as IDataObject[]);
			}

			return this.prepareOutputData(responseData);

		} catch (error ) {
			if (this.continueOnFail()) {
				return [this.helpers.returnJsonArray({ error: (error as Error).message })];
			} else {
				throw error;
			}
		}
	}
}
