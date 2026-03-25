import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type {
	ExecutionError,
	IDataTableProjectAggregateService,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, nodeNameToToolName, NodeOperationError } from 'n8n-workflow';

import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

export class ToolDataTableSql implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Table SQL Read Tool',
		name: 'toolDataTableSql',
		icon: 'fa:database',
		iconColor: 'orange-red',
		group: ['transform'],
		version: [1],
		description: 'Let AI agents query data tables using SQL SELECT statements',
		defaults: {
			name: 'Data Table SQL Read',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Data Tables',
				name: 'dataTables',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAvailableDataTables',
				},
				required: true,
				default: [],
				description: 'Select which data tables the AI agent can query via SQL',
			},
			{
				displayName: 'Tool Description',
				name: 'toolDescription',
				type: 'string',
				default: '',
				typeOptions: { rows: 3 },
				description: 'Override the auto-generated tool description sent to the AI',
			},
		],
	};

	methods = {
		loadOptions: {
			async getAvailableDataTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const aggregateProxy = await getAggregateProxy(this);
				if (!aggregateProxy) return [];

				const result = await aggregateProxy.getManyAndCount({ take: 1000 });
				return result.data.map((table) => ({
					name: table.name,
					value: table.id,
				}));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const name = nodeNameToToolName(node);
		const selectedTableIds = this.getNodeParameter('dataTables', itemIndex) as string[];
		const toolDescriptionOverride = this.getNodeParameter(
			'toolDescription',
			itemIndex,
			'',
		) as string;

		if (selectedTableIds.length === 0) {
			throw new NodeOperationError(node, 'At least one data table must be selected');
		}

		// Build schema description for each selected table
		const schemaLines: string[] = [];
		const aggregateProxy = await getAggregateProxy(this);
		if (!aggregateProxy) {
			throw new NodeOperationError(node, 'Data tables module is not available');
		}

		const getDataTableSqlName = this.helpers.getDataTableSqlName;
		if (!getDataTableSqlName) {
			throw new NodeOperationError(node, 'Data tables module is not available');
		}

		// Fetch all table metadata to get friendly names
		const allTables = await aggregateProxy.getManyAndCount({ take: 1000 });
		const tableNameMap = new Map(allTables.data.map((t) => [t.id, t.name]));

		for (const tableId of selectedTableIds) {
			const proxy = await getTableProxy(this, tableId);
			if (!proxy) continue;

			const columns = await proxy.getColumns();
			const friendlyName = tableNameMap.get(tableId) ?? tableId;
			const columnDefs = [
				'id (number)',
				'createdAt (date)',
				'updatedAt (date)',
				...columns.map((c) => `${c.name} (${c.type})`),
			].join(', ');
			const tableName = getDataTableSqlName(tableId);
			schemaLines.push(
				`- Table name in SQL: "${tableName}" (user calls it "${friendlyName}"). Columns: ${columnDefs}`,
			);
		}

		const description =
			toolDescriptionOverride ||
			[
				'Query data tables using SQL SELECT statements.',
				'IMPORTANT: You MUST use the exact table names shown below in your SQL queries. Do NOT use the human-readable names in parentheses — those are only for your reference to understand what the table contains.',
				'',
				'Available tables:',
				...schemaLines,
				'',
				'Only SELECT queries are allowed. Use standard SQL syntax.',
			].join('\n');

		const executeRawSql = this.helpers.executeDataTableRawSql;
		if (!executeRawSql) {
			throw new NodeOperationError(node, 'Data tables module is not available');
		}

		const tool = new DynamicStructuredTool({
			name,
			description,
			schema: z.object({
				sql: z.string().describe('The SQL SELECT query to execute against the data tables'),
			}),
			func: async (input: { sql: string }, _runManager, toolCallId): Promise<string> => {
				const { index } = this.addInputData(NodeConnectionTypes.AiTool, [
					[{ json: { query: input.sql, toolCallId } }],
				]);

				let response = '';
				let executionError: ExecutionError | undefined;
				try {
					const rows = await executeRawSql(input.sql, selectedTableIds);
					response = JSON.stringify(rows);
				} catch (error: unknown) {
					executionError = new NodeOperationError(node, error as Error);
					response = `There was an error: "${executionError.message}"`;
				}

				if (executionError) {
					void this.addOutputData(NodeConnectionTypes.AiTool, index, executionError);
				} else {
					void this.addOutputData(NodeConnectionTypes.AiTool, index, [[{ json: { response } }]]);
				}

				return response;
			},
		});

		return {
			response: logWrapper(tool, this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const input = this.getInputData();
		const selectedTableIds = this.getNodeParameter('dataTables', 0) as string[];
		const executeRawSql = this.helpers.executeDataTableRawSql;

		if (!executeRawSql) {
			throw new NodeOperationError(this.getNode(), 'Data tables module is not available');
		}

		const result: INodeExecutionData[] = [];
		for (let i = 0; i < input.length; i++) {
			const sql = input[i].json.sql as string;
			if (!sql) {
				throw new NodeOperationError(this.getNode(), 'Input must contain a "sql" field', {
					itemIndex: i,
				});
			}
			const rows = await executeRawSql(sql, selectedTableIds);
			result.push({
				json: { response: rows },
				pairedItem: { item: i },
			});
		}

		return [result];
	}
}

async function getAggregateProxy(
	ctx: ISupplyDataFunctions | ILoadOptionsFunctions | IExecuteFunctions,
): Promise<IDataTableProjectAggregateService | undefined> {
	if (!ctx.helpers.getDataTableAggregateProxy) return undefined;
	return await ctx.helpers.getDataTableAggregateProxy();
}

async function getTableProxy(ctx: ISupplyDataFunctions | IExecuteFunctions, tableId: string) {
	if (!ctx.helpers.getDataTableProxy) return undefined;
	return await ctx.helpers.getDataTableProxy(tableId);
}
