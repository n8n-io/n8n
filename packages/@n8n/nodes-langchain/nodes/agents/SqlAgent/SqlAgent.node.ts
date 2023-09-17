import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { SqlDatabase } from 'langchain/sql_db';
import type { SqlCreatePromptArgs } from 'langchain/agents/toolkits/sql';
import { SqlToolkit, createSqlAgent } from 'langchain/agents/toolkits/sql';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import type { DataSource } from 'typeorm';
import { getSqliteDataSource } from './handlers/sqlite';
import { getPostgresDataSource } from './handlers/postgres';
import { SQL_PREFIX, SQL_SUFFIX } from './prompts';
import { getMysqlDataSource } from './handlers/mysql';

const parseTablesString = (tablesString: string) =>
	tablesString
		.split(',')
		.map((table) => table.trim())
		.filter((table) => table.length > 0);

export class SqlAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQL Agent',
		name: 'sqlAgent',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Answers questions over a SQL database',
		defaults: {
			name: 'SQL Agent',
			color: '#404040',
		},
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'mySql',
				required: true,
				testedBy: 'mysqlConnectionTest',
				displayOptions: {
					show: {
						dataSource: ['mysql'],
					},
				},
			},
			{
				name: 'postgres',
				required: true,
				displayOptions: {
					show: {
						dataSource: ['postgres'],
					},
				},
			},
		],
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			'main',
			{
				displayName: 'Model',
				maxConnections: 1,
				type: 'languageModel',
				required: true,
			},
		],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Data Source',
				name: 'dataSource',
				type: 'options',
				default: 'sqlite',
				description: 'SQL database to connect to',
				options: [
					{
						name: 'MySQL',
						value: 'mysql',
						description: 'Connect to a MySQL database',
					},
					{
						name: 'Postgres',
						value: 'postgres',
						description: 'Connect to a Postgres database',
					},
					{
						name: 'SQLite',
						value: 'sqlite',
						description: 'Use SQLite by connecting a database file as binary input',
					},
				],
			},
			{
				displayName: 'Prompt',
				name: 'input',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 5,
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Ignored Tables',
						name: 'ignoredTables',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of tables to ignore from the database. If empty, no tables are ignored.',
					},
					{
						displayName: 'Include Sample Rows',
						name: 'includedSampleRows',
						type: 'number',
						description:
							'Number of sample rows to include in the prompt to the agent. It helps the agent to understand the schema of the database but it also increases the amount of tokens used.',
						default: 3,
					},
					{
						displayName: 'Included Tables',
						name: 'includedTables',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of tables to include in the database. If empty, all tables are included.',
					},
					{
						displayName: 'Prefix Prompt',
						name: 'prefixPrompt',
						type: 'string',
						default: SQL_PREFIX,
						description: 'Prefix prompt to use for the agent',
						typeOptions: {
							rows: 10,
						},
					},
					{
						displayName: 'Suffix Prompt',
						name: 'suffixPrompt',
						type: 'string',
						default: SQL_SUFFIX,
						description: 'Suffix prompt to use for the agent',
						typeOptions: {
							rows: 4,
						},
					},
					{
						displayName: 'Top K',
						name: 'topK',
						type: 'number',
						default: 10,
						description: 'Number of top results agent should return',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing SQL Agent');

		const model = (await this.getInputConnectionData('languageModel', 0)) as BaseLanguageModel;
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const input = this.getNodeParameter('input', i) as string;
			const options = this.getNodeParameter('options', i, {});
			const selectedDataSource = this.getNodeParameter('dataSource', i, 'sqlite') as
				| 'mysql'
				| 'postgres'
				| 'sqlite';

			const includedSampleRows = options.includedSampleRows as number;
			const includedTablesArray = parseTablesString((options.includedTables as string) ?? '');
			const ignoredTablesArray = parseTablesString((options.ignoredTables as string) ?? '');

			let dataSource: DataSource | null = null;
			if (selectedDataSource === 'sqlite') {
				if (!item.binary) {
					throw new NodeOperationError(
						this.getNode(),
						'No binary data found, please connect a binary to the input if you want to use SQLite as data source',
					);
				}

				dataSource = getSqliteDataSource.call(this, item.binary);
			}

			if (selectedDataSource === 'postgres') {
				dataSource = await getPostgresDataSource.call(this);
			}

			if (selectedDataSource === 'mysql') {
				dataSource = await getMysqlDataSource.call(this);
			}

			if (!dataSource) {
				throw new NodeOperationError(
					this.getNode(),
					'No data source found, please configure data source',
				);
			}

			const agentOptions: SqlCreatePromptArgs = {
				topK: (options.topK as number) ?? 10,
				prefix: (options.prefixPrompt as string) ?? SQL_PREFIX,
				suffix: (options.suffixPrompt as string) ?? SQL_SUFFIX,
			};

			const dbInstance = await SqlDatabase.fromDataSourceParams({
				appDataSource: dataSource,
				includesTables: includedTablesArray.length > 0 ? includedTablesArray : undefined,
				ignoreTables: ignoredTablesArray.length > 0 ? ignoredTablesArray : undefined,
				sampleRowsInTableInfo: includedSampleRows ?? 3,
			});

			const toolkit = new SqlToolkit(dbInstance, model);
			const agentExecutor = createSqlAgent(model, toolkit, agentOptions);

			const response = await agentExecutor.call({ input });

			returnData.push({ json: response });
		}

		return this.prepareOutputData(returnData);
	}
}
