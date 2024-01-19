import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { SqlDatabase } from 'langchain/sql_db';
import type { SqlCreatePromptArgs } from 'langchain/agents/toolkits/sql';
import { SqlToolkit, createSqlAgent } from 'langchain/agents/toolkits/sql';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import type { DataSource } from 'typeorm';

import { getSqliteDataSource } from './other/handlers/sqlite';
import { getPostgresDataSource } from './other/handlers/postgres';
import { SQL_PREFIX, SQL_SUFFIX } from './other/prompts';
import { getMysqlDataSource } from './other/handlers/mysql';

const parseTablesString = (tablesString: string) =>
	tablesString
		.split(',')
		.map((table) => table.trim())
		.filter((table) => table.length > 0);

export async function sqlAgentAgentExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	this.logger.verbose('Executing SQL Agent');

	const model = (await this.getInputConnectionData(
		NodeConnectionType.AiLanguageModel,
		0,
	)) as BaseLanguageModel;
	const items = this.getInputData();

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const input = this.getNodeParameter('input', i) as string;

		if (input === undefined) {
			throw new NodeOperationError(this.getNode(), 'The ‘prompt’ parameter is empty.');
		}

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

		const response = await agentExecutor.call({ input, signal: this.getExecutionCancelSignal() });

		returnData.push({ json: response });
	}

	return await this.prepareOutputData(returnData);
}
