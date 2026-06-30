import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { DynamicTool } from '@langchain/core/tools';
import type { DataSource } from '@n8n/typeorm';
import type { SqlCreatePromptArgs } from '@langchain/classic/agents/toolkits/sql';
import { SqlToolkit, createSqlAgent } from '@langchain/classic/agents/toolkits/sql';
import { SqlDatabase } from '@langchain/classic/sql_db';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
} from 'n8n-workflow';

import { getPromptInputByType, serializeChatHistory } from '@utils/helpers';
import type { TracingMetadataEntry } from '@utils/tracing';
import { buildTracingMetadata, getTracingConfig } from '@utils/tracing';

import { getMysqlDataSource } from './other/handlers/mysql';
import { getPostgresDataSource } from './other/handlers/postgres';
import { getSqliteDataSource } from './other/handlers/sqlite';
import { SQL_PREFIX, SQL_SUFFIX } from './other/prompts';

const parseTablesString = (tablesString: string) =>
	tablesString
		.split(',')
		.map((table) => table.trim())
		.filter((table) => table.length > 0);

const BLOCKED_SQL_OPERATIONS = new Set([
	'INSERT',
	'UPDATE',
	'DELETE',
	'DROP',
	'TRUNCATE',
	'ALTER',
	'CREATE',
	'REPLACE',
	'MERGE',
]);

export function detectBlockedSqlKeyword(sql: string): string | undefined {
	const stripped = sql
		.replace(/--[^\n]*/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/'(?:[^'\\]|\\.)*'/g, "''")
		.replace(/"(?:[^"\\]|\\.)*"/g, '""');

	const pattern = new RegExp(`\\b(${[...BLOCKED_SQL_OPERATIONS].join('|')})\\b`, 'i');
	const match = stripped.match(pattern);
	return match ? match[1].toUpperCase() : undefined;
}

export async function sqlAgentAgentExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing SQL Agent');

	const model = (await this.getInputConnectionData(
		NodeConnectionTypes.AiLanguageModel,
		0,
	)) as BaseLanguageModel;
	const items = this.getInputData();

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const item = items[i];
			let input;
			if (this.getNode().typeVersion <= 1.2) {
				input = this.getNodeParameter('input', i) as string;
			} else {
				input = getPromptInputByType({
					ctx: this,
					i,
					inputKey: 'text',
					promptTypeKey: 'promptType',
				});
			}

			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘prompt’ parameter is empty.');
			}

			const options = this.getNodeParameter('options', i, {}) as IDataObject & {
				tracingMetadata?: { values?: TracingMetadataEntry[] };
			};
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

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
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

			agentExecutor.tools = agentExecutor.tools.map((tool) => {
				if (tool.name !== 'query-sql') return tool;

				return new DynamicTool({
					name: tool.name,
					description: tool.description,
					func: async (sqlInput: string) => {
						const blockedKeyword = detectBlockedSqlKeyword(sqlInput);
						if (blockedKeyword) {
							throw new NodeOperationError(
								this.getNode(),
								`SQL operation "${blockedKeyword}" is not allowed`,
								{ itemIndex: i },
							);
						}
						return String(await tool.invoke(sqlInput));
					},
				});
			});

			const memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			agentExecutor.memory = memory;

			let chatHistory = '';
			if (memory) {
				const messages = await memory.chatHistory.getMessages();
				chatHistory = serializeChatHistory(messages);
			}

			let response: IDataObject;
			const additionalMetadata = buildTracingMetadata(options.tracingMetadata?.values, this.logger);
			if (Object.keys(additionalMetadata).length > 0) {
				this.logger.debug('Tracing metadata', { additionalMetadata });
			}
			const tracingConfig = getTracingConfig(this, { additionalMetadata });
			try {
				response = await agentExecutor.withConfig(tracingConfig).invoke({
					input,
					signal: this.getExecutionCancelSignal(),
					chatHistory,
				});
			} catch (error) {
				if ((error.message as IDataObject)?.output) {
					response = error.message as IDataObject;
				} else {
					throw new NodeOperationError(this.getNode(), error.message as string, { itemIndex: i });
				}
			}

			returnData.push({ json: response });
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}

			throw error;
		}
	}

	return [returnData];
}
