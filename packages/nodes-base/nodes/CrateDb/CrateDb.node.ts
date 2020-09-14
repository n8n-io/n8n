import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	getItemCopy,
	pgInsert,
	pgQuery,
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
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '*',
				description: 'Comma separated list of the fields that the operation will return',
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
					'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
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

		let returnItems = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const queryResult = await pgQuery(this.getNodeParameter, pgp, db, items);

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			const [insertData, insertItems] = await pgInsert(this.getNodeParameter, pgp, db, items);

			// Add the id to the data
			for (let i = 0; i < insertData.length; i++) {
				returnItems.push({
					json: {
						...insertData[i],
						...insertItems[i],
					},
				});
			}
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------
			const tableName = this.getNodeParameter('table', 0) as string;
			const updateKey = this.getNodeParameter('updateKey', 0) as string;

			const queries : string[] = [];
			const updatedKeys : string[] = [];
			let updateKeyValue : string | number;
			let columns : string[] = [];

			items.map(item => {
				const setOperations : string[] = [];
				columns = Object.keys(item.json);
				columns.map((col : string) => {
					if (col !== updateKey) {
						if (typeof item.json[col] === 'string') {
							setOperations.push(`${col} = \'${item.json[col]}\'`);
						} else {
							setOperations.push(`${col} = ${item.json[col]}`);
						}
					}
				});

				updateKeyValue = item.json[updateKey] as string | number;

				if (updateKeyValue === undefined) {
					throw new Error('No value found for update key!');
				}

				updatedKeys.push(updateKeyValue as string);

				const query = `UPDATE "${tableName}" SET ${setOperations.join(',')} WHERE ${updateKey} = ${updateKeyValue};`;
				queries.push(query);
			});


			await db.any(pgp.helpers.concat(queries));

			returnItems = this.helpers.returnJsonArray(getItemCopy(items, columns) as IDataObject[]);
		} else {
			await pgp.end();
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		// Close the connection
		await pgp.end();

		return this.prepareOutputData(returnItems);
	}
}
