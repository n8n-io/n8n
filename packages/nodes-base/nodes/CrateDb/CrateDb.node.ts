import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	pgInsert,
	pgQuery,
	pgUpdate,
	getItemCopy,
	generateReturning,
} from '../Postgres/Postgres.node.functions';

import * as pgPromise from 'pg-promise';

export class CrateDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrateDB',
		name: 'crateDb',
		icon: 'file:cratedb.png',
		group: ['input'],
		version: 1,
		description: 'Add and update data in CrateDB.',
		defaults: {
			name: 'CrateDB',
			color: '#47889f',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'crateDb',
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
						description: 'Execute an SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in database',
					},
				],
				default: 'insert',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Normal',
						value: 'normal',
						description: 'Execute all querys together',
					},
					{
						name: 'Independently',
						value: 'independently',
						description: 'Execute each query independently',
					},
				],
				default: 'normal',
				description: 'The mode how the querys should execute.',
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
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
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: 'doc',
				required: true,
				description: 'Name of the schema the table belongs to',
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
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
						operation: ['insert'],
					},
				},
				default: '',
				placeholder: 'id,name,description',
				description:
					'Comma separated list of the properties which should used as columns for the new rows.',
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: 'public',
				required: true,
				description: 'Name of the schema the table belongs to',
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
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
						operation: ['update'],
					},
				},
				default: 'id',
				required: true,
				description:
					'Comma separated list of the properties which decides which rows in the database should be updated. Normally that would be "id".',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: '',
				placeholder: 'name,description',
				description:
					'Comma separated list of the properties which should used as columns for rows to update.',
			},

			// ----------------------------------
			//         insert,update
			// ----------------------------------
			{
				displayName: 'Enable Returning',
				name: 'enableReturning',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['insert', 'update'],
					},
				},
				default: true,
				description: 'Should the operation return the data',
			},
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert', 'update'],
						enableReturning: [true],
					},
				},
				default: '*',
				description: 'Comma separated list of the fields that the operation will return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials('crateDb');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const pgp = pgPromise();

		const config = {
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			ssl: !['disable', undefined].includes(credentials.ssl as string | undefined),
			sslmode: (credentials.ssl as string) || 'disable',
		};

		const db = pgp(config);

		let returnItems: INodeExecutionData[] = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const mode = this.getNodeParameter('mode', 0) as string;
		const enableReturning = this.getNodeParameter('enableReturning', 0) as boolean;
		if(mode == 'transaction') throw new Error('transaction mode not supported');

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const queryResult = await pgQuery(this.getNodeParameter, pgp, db, items, mode, this.continueOnFail());

			returnItems = this.helpers.returnJsonArray(queryResult);
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const insertData = await pgInsert(this.getNodeParameter, pgp, db, items, mode, enableReturning, this.continueOnFail());

			for (let i = 0; i < insertData.length; i++) {
				returnItems.push({
					json: insertData[i],
				});
			}
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------
			
			if(mode === 'independently') {
				const updateItems = await pgUpdate(this.getNodeParameter, pgp, db, items, mode, enableReturning, this.continueOnFail());

				returnItems = this.helpers.returnJsonArray(updateItems);
			} else if(mode === 'normal') {
				const table = this.getNodeParameter('table', 0) as string;
				const schema = this.getNodeParameter('schema', 0) as string;
				const updateKeys = (this.getNodeParameter('updateKey', 0) as string).split(',').map(column => column.trim());
				const columns = (this.getNodeParameter('columns', 0) as string).split(',').map(column => column.trim());
				const queryColumns = columns.slice();

				updateKeys.forEach(updateKey => {
					if (!queryColumns.includes(updateKey)) {
						columns.unshift(updateKey);
						queryColumns.unshift('?' + updateKey);
					}
				});

				const cs = new pgp.helpers.ColumnSet(queryColumns, { table: { table, schema } });

				const where = ' WHERE ' + updateKeys.map(updateKey => pgp.as.name(updateKey) + ' = ${' + updateKey + '}').join(' AND ');
				
				if(enableReturning) {
					const returning = generateReturning(pgp, this.getNodeParameter('returnFields', 0) as string);
					const queries:string[] = [];
					for (let i = 0; i < items.length; i++) {
						const itemCopy = getItemCopy(items[i], columns);
						queries.push(pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning);
					}
					const updateItems = (await db.multi(pgp.helpers.concat(queries))).flat(1);
					returnItems = this.helpers.returnJsonArray(updateItems);
				} else {
					const queries:string[] = [];
					for (let i = 0; i < items.length; i++) {
						const itemCopy = getItemCopy(items[i], columns);
						queries.push(pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy));
					}
					await db.none(pgp.helpers.concat(queries));
				}
			}
		} else {
			await pgp.end();
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		// Close the connection
		await pgp.end();

		return this.prepareOutputData(returnItems);
	}
}
