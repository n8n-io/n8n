/**
 * Starting rows for the Data Tables a workflow uses. The execution service
 * writes them into the real tables before a scenario runs, so Data Table nodes
 * run for real: they set `pairedItem`, apply their own filters and see the rows
 * the same run wrote earlier.
 */

import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { buildDateAnchors } from '@n8n/workflow-sdk';
import { type DataTableRows, type INode, jsonParse, OperationalError } from 'n8n-workflow';

export const DATA_TABLE_NODE_TYPES = new Set([
	'n8n-nodes-base.dataTable',
	'n8n-nodes-base.dataTableTool',
]);

const DATA_TABLE_ROWS_LLM_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 2;

export interface ScenarioDataTable {
	name: string;
	columns: Array<{ name: string; type: string }>;
	/** The workflow's nodes that use this table. */
	nodes: INode[];
}

export interface GenerateDataTableRowsOptions {
	tables: ScenarioDataTable[];
	globalContext: string;
	nodeHints: Record<string, string>;
	scenarioHints?: string;
}

export interface GeneratedDataTableRows {
	/** Rows by table name. A table the model left out starts empty. */
	rowsByTable: Record<string, DataTableRows>;
	warnings: string[];
}

const SYSTEM_PROMPT = `You prepare the stored data for one test run of an n8n workflow. The workflow uses n8n Data Tables. Return the rows each table holds at the moment the run starts.

Rules:
1. The Test Scenario is authoritative. Reproduce every stored record, fact and count it states.
2. Return only rows that exist BEFORE the run. Do not add a row that the workflow itself writes during the run, unless the scenario says that the row already exists.
3. When the scenario says nothing about a table: a table that the workflow only writes to starts empty, and a table that the workflow reads gets the few rows that the data context implies. Never add a row that contradicts the scenario, for example a record that the scenario calls new.
4. A table that the workflow writes to holds rows that the workflow wrote on earlier runs. Give those rows the value formats that the workflow's write nodes use, for example the same spelling and casing of a status, also when the scenario quotes the value in another spelling or casing. Keep the facts the scenario states: which records exist, their status, their dates.
5. Use only the listed columns. Do not return id, createdAt or updatedAt: the table sets them.
6. A string column takes a string, a number column a number, a boolean column true or false, and a date column an ISO 8601 timestamp. Use null for an empty value.

Return only a JSON object with one key for each listed table: { "<table name>": [ { "<column>": <value> } ] }`;

function buildUserPrompt(options: GenerateDataTableRowsOptions): string {
	const sections: string[] = [];
	if (options.scenarioHints) sections.push(`## Test Scenario\n\n${options.scenarioHints}`);
	if (options.globalContext) sections.push(`## Data context\n\n${options.globalContext}`);

	const tables = options.tables.map((table) => {
		const lines = [
			`### ${table.name}`,
			`Columns: ${table.columns.map((column) => `${column.name} (${column.type})`).join(', ') || 'none'}`,
			'Nodes that use this table:',
		];
		for (const node of table.nodes) {
			lines.push(`- "${node.name}" (${node.type}): ${JSON.stringify(node.parameters)}`);
			const hint = options.nodeHints[node.name];
			if (hint) lines.push(`  Expected data: ${hint}`);
		}
		return lines.join('\n');
	});
	sections.push(`## Tables\n\n${tables.join('\n\n')}`);
	sections.push(buildDateAnchors(new Date()));
	return sections.join('\n\n');
}

function fitsColumnType(cell: string | number | boolean | null, type: string): boolean {
	if (cell === null) return true;
	switch (type) {
		case 'number':
			return (
				typeof cell === 'number' ||
				(typeof cell === 'string' && cell.trim() !== '' && !Number.isNaN(Number(cell)))
			);
		case 'boolean':
			return typeof cell === 'boolean';
		case 'date':
			return typeof cell === 'string' && !Number.isNaN(Date.parse(cell));
		default:
			return true;
	}
}

function parseRows(text: string, tables: ScenarioDataTable[]): GeneratedDataTableRows {
	const parsed: unknown = jsonParse(extractJsonCandidate(text));
	if (!isRecord(parsed))
		throw new OperationalError('Data table rows response is not a JSON object');

	const rowsByTable: Record<string, DataTableRows> = {};
	const warnings: string[] = [];
	for (const table of tables) {
		const rows = parsed[table.name];
		if (rows === undefined || rows === null) continue;
		if (!Array.isArray(rows)) {
			throw new OperationalError(`Data table rows for "${table.name}" are not an array`);
		}
		const typeByColumn = new Map(table.columns.map((column) => [column.name, column.type]));
		const dropped = new Set<string>();
		rowsByTable[table.name] = rows.filter(isRecord).map((row) => {
			const kept: DataTableRows[number] = {};
			for (const [key, value] of Object.entries(row)) {
				const type = typeByColumn.get(key);
				if (type === undefined) {
					dropped.add(key);
					continue;
				}
				const cell =
					typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
						? value
						: null;
				// A wrong type would fail the insert, after this call's retry.
				if (!fitsColumnType(cell, type)) {
					throw new OperationalError(
						`Data table rows for "${table.name}" put ${JSON.stringify(cell)} in ${type} column "${key}"`,
					);
				}
				kept[key] = cell;
			}
			return kept;
		});
		if (dropped.size > 0) {
			warnings.push(
				`Data table rows for "${table.name}" named unknown columns, dropped: ${[...dropped].join(', ')}`,
			);
		}
	}
	return { rowsByTable, warnings };
}

/** One LLM call for every table, so the tables agree with each other and with the HTTP mocks. */
export async function generateDataTableRows(
	options: GenerateDataTableRowsOptions,
): Promise<GeneratedDataTableRows> {
	if (options.tables.length === 0) return { rowsByTable: {}, warnings: [] };

	const agent = createEvalAgent('eval-data-table-rows', {
		instructions: SYSTEM_PROMPT,
		cache: true,
	});
	const prompt = buildUserPrompt(options);

	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const result = await agent.generate(prompt, {
				providerOptions: { anthropic: { maxTokens: 16_384 } },
				abortSignal: AbortSignal.timeout(DATA_TABLE_ROWS_LLM_TIMEOUT_MS),
			});
			return parseRows(extractText(result), options.tables);
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError;
}
