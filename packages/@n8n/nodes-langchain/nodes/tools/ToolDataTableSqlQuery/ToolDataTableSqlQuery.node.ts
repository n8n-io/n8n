import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, nodeNameToToolName } from 'n8n-workflow';
import { z } from 'zod';

import { getConnectionHintNoticeField } from '@n8n/ai-utilities';

import { N8nTool } from '@utils/N8nTool';

export class ToolDataTableSqlQuery implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Table SQL Query Tool',
		name: 'toolDataTableSqlQuery',
		icon: 'fa:database',
		iconColor: 'orange-red',
		group: ['output'],
		version: 1,
		description: 'Run read-only SQL queries against data tables',
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.tooldatatablesqlquery/',
					},
				],
			},
		},
		defaults: {
			name: 'Data Table SQL Query',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Table Names or IDs',
				name: 'tables',
				type: 'multiOptions',
				required: true,
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTables',
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
						displayName: 'Max Rows',
						name: 'maxRows',
						type: 'number',
						default: 100,
						description: 'Maximum number of rows to return per query',
						typeOptions: {
							minValue: 1,
							maxValue: 1000,
						},
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				if (!this.helpers.getDataTableAggregateProxy) {
					throw new NodeOperationError(this.getNode(), 'Data table module is not available');
				}

				const proxy = await this.helpers.getDataTableAggregateProxy();
				const result = await proxy.getManyAndCount({ take: 500 });

				return result.data.map((table) => ({
					name: table.name,
					value: table.id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const result: INodeExecutionData[] = [];
		const input = this.getInputData();

		for (let i = 0; i < input.length; i++) {
			const sql = input[i].json.sql as string | undefined;
			if (!sql) {
				throw new NodeOperationError(this.getNode(), 'Input item must have a "sql" property', {
					itemIndex: i,
				});
			}

			const tableIds = this.getNodeParameter('tables', i) as string[];
			const options = this.getNodeParameter('options', i, {}) as { maxRows?: number };

			if (!this.helpers.executeSqlQuery) {
				throw new NodeOperationError(this.getNode(), 'Data table module is not available');
			}

			const queryResult = await this.helpers.executeSqlQuery(sql, tableIds, {
				maxRows: options.maxRows,
			});

			result.push({
				json: {
					rows: queryResult.rows,
					rowCount: queryResult.rowCount,
					truncated: queryResult.truncated,
				},
				pairedItem: { item: i },
			});
		}

		return [result];
	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const name = nodeNameToToolName(this.getNode());
		const tableIds = this.getNodeParameter('tables', itemIndex) as string[];
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxRows?: number;
		};

		if (!tableIds.length) {
			throw new NodeOperationError(this.getNode(), 'At least one table must be selected');
		}

		if (!this.helpers.getTableSchemas) {
			throw new NodeOperationError(this.getNode(), 'Data table module is not available');
		}

		// Fetch table schemas for the tool description
		const schemas = await this.helpers.getTableSchemas(tableIds);

		// Build the tool description with schema information
		const schemaDescription = schemas
			.map((table) => {
				const cols = table.columns.map((c) => `  - ${c.name} (${c.type})`).join('\n');
				return `Table "${table.name}":\n${cols}`;
			})
			.join('\n\n');

		const toolDescription = [
			'Execute read-only SQL SELECT queries against the following data tables.',
			'',
			'Available tables and their columns:',
			schemaDescription,
			'',
			'SQL format rules (queries that violate these will be rejected):',
			'- Write ONLY: SELECT ... FROM ... [JOIN ... ON ...] [WHERE ...] [GROUP BY ...] [HAVING ...] [ORDER BY ...] [LIMIT ...] [OFFSET ...]',
			'- IMPORTANT: All table names, column names, and aliases MUST be double-quoted. Example: SELECT "orders"."amount" FROM "orders" WHERE "status" = \'active\'',
			'- Use ONLY the table and column names listed above. Every name in the query must be a known table or column',
			'- Do NOT use aliases. Use full table names: SELECT "orders"."amount" FROM "orders" (not SELECT "o"."amount" FROM "orders" AS "o")',
			'- Joins: JOIN, LEFT JOIN, RIGHT JOIN, INNER JOIN, CROSS JOIN with ON conditions',
			'- Operators: =, !=, <>, <, >, <=, >=, AND, OR, NOT, IN, BETWEEN, LIKE, IS NULL, IS NOT NULL',
			'- Functions: COUNT, SUM, AVG, MIN, MAX, LOWER, UPPER, TRIM, LENGTH, SUBSTR, REPLACE, ABS, ROUND, COALESCE, NULLIF (function names are NOT quoted)',
			'- Use CAST(expr AS type) for type conversion (not :: syntax). Type names like TEXT, INTEGER are NOT quoted',
			'- Use CASE WHEN ... THEN ... ELSE ... END for conditionals',
			'- Do NOT use: subqueries, CTEs (WITH), UNION, window functions (OVER), comments, semicolons, or backticks',
			'',
			'Best practices:',
			'- Prefer case-insensitive comparisons for text search: use LOWER("column") = LOWER(value) or ILIKE instead of exact match, unless the user explicitly asks for case-sensitive matching',
		].join('\n');

		const schema = z.object({
			sql: z.string().describe('The SQL SELECT query to execute'),
		});

		const tool = new N8nTool(this, {
			name,
			description: toolDescription,
			schema,
			func: async (input: { sql: string }): Promise<string> => {
				if (!this.helpers.executeSqlQuery) {
					throw new NodeOperationError(this.getNode(), 'Data table SQL module is not available');
				}

				try {
					const result = await this.helpers.executeSqlQuery(input.sql, tableIds, {
						maxRows: options.maxRows,
					});

					const output: Record<string, unknown> = {
						rows: result.rows,
						rowCount: result.rowCount,
					};

					if (result.truncated) {
						output.note = `Results truncated to ${result.rowCount} rows. Use LIMIT and OFFSET to paginate.`;
					}

					return JSON.stringify(output);
				} catch (error) {
					// Return error as string so the agent can see it and retry with corrected SQL
					const message = error instanceof Error ? error.message : String(error);
					return JSON.stringify({ error: message });
				}
			},
		});

		return { response: tool };
	}
}
