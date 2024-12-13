import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { DataSource } from '@n8n/typeorm';
import type { SqlCreatePromptArgs } from 'langchain/agents/toolkits/sql';
import { SqlToolkit, createSqlAgent } from 'langchain/agents/toolkits/sql';
import { SqlDatabase } from 'langchain/sql_db';
import {
	type AiRootNodeExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
	type IDataObject,
} from 'n8n-workflow';

import { serializeChatHistory } from '@utils/helpers';

import { getMysqlDataSource } from './other/handlers/mysql';
import { getPostgresDataSource } from './other/handlers/postgres';
import { getSqliteDataSource } from './other/handlers/sqlite';
import { SQL_PREFIX, SQL_SUFFIX } from './other/prompts';

const parseTablesString = (tablesString: string) =>
	tablesString
		.split(',')
		.map((table) => table.trim())
		.filter((table) => table.length > 0);

export async function sqlAgentAgentExecute(
	this: AiRootNodeExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing SQL Agent');

	const model = (await this.getInputConnectionData(
		NodeConnectionType.AiLanguageModel,
		0,
	)) as BaseLanguageModel;
	const items = this.getInputData();

	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const item = items[itemIndex];
			let input;
			if (this.getNode().typeVersion <= 1.2) {
				input = this.getNodeParameter('input', itemIndex) as string;
			} else {
				input = this.getPromptInputByType(itemIndex, 'text', 'promptType');
			}

			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘prompt’ parameter is empty.');
			}

			const options = this.getNodeParameter('options', itemIndex, {});
			const selectedDataSource = this.getNodeParameter('dataSource', itemIndex, 'sqlite') as
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

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data');
				dataSource = await getSqliteDataSource.call(this, item.binary, binaryPropertyName);
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
				inputVariables: ['chatHistory', 'input', 'agent_scratchpad'],
			};

			const dbInstance = await SqlDatabase.fromDataSourceParams({
				appDataSource: dataSource,
				includesTables: includedTablesArray.length > 0 ? includedTablesArray : undefined,
				ignoreTables: ignoredTablesArray.length > 0 ? ignoredTablesArray : undefined,
				sampleRowsInTableInfo: includedSampleRows ?? 3,
			});

			const toolkit = new SqlToolkit(dbInstance, model);
			const agentExecutor = createSqlAgent(model, toolkit, agentOptions);

			const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			agentExecutor.memory = memory;

			let chatHistory = '';
			if (memory) {
				const messages = await memory.chatHistory.getMessages();
				chatHistory = serializeChatHistory(messages);
			}

			let response: IDataObject;
			try {
				response = await agentExecutor.withConfig(this.getTracingConfig()).invoke({
					input,
					signal: this.getExecutionCancelSignal(),
					chatHistory,
				});
			} catch (error) {
				if ((error.message as IDataObject)?.output) {
					response = error.message as IDataObject;
				} else {
					throw new NodeOperationError(this.getNode(), error.message as string, { itemIndex });
				}
			}

			returnData.push({ json: response });
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
				continue;
			}

			throw error;
		}
	}

	return [returnData];
}
