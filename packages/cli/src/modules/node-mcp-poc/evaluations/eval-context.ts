import { AsyncLocalStorage } from 'node:async_hooks';

import type { INodeParameters, ResourceMapperField } from 'n8n-workflow';

import type {
	CompiledNodeToolset,
	CompiledOperationTool,
	DynamicResolutionResult,
} from '../json-schema/node-mcp-poc.types';
import { benchmarkTasks } from './cases';

export const NODE_MCP_EVAL_CASE_HEADER = 'x-n8n-node-mcp-eval-case';

const activeCase = new AsyncLocalStorage<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fixtureError(message: string) {
	return { status: 'error' as const, error: message };
}

function isRecentDateQuery(value: unknown) {
	return (
		typeof value === 'string' &&
		(/(?:after:20\d{2}[-/]\d{2}[-/]\d{2})/i.test(value) || /newer_than:7d/i.test(value))
	);
}

function isValidGmailFilter(parameters: INodeParameters) {
	const filters = parameters.filters;
	if (!isRecord(filters)) return false;
	const sender = Reflect.get(filters, 'sender');
	const readStatus = Reflect.get(filters, 'readStatus');
	const receivedAfter = Reflect.get(filters, 'receivedAfter');
	const filterQuery = Reflect.get(filters, 'q');
	const labelIds = Reflect.get(filters, 'labelIds');
	const explicit =
		sender === 'jordan.lee@example.com' &&
		readStatus === 'unread' &&
		(typeof receivedAfter === 'string' || isRecentDateQuery(filterQuery));
	const query = typeof filterQuery === 'string' ? filterQuery : '';
	const queryBased =
		query.includes('from:jordan.lee@example.com') &&
		isRecentDateQuery(query) &&
		(query.includes('is:unread') || (Array.isArray(labelIds) && labelIds.includes('UNREAD')));
	return explicit || queryBased;
}

function isValidSheetMutation(parameters: INodeParameters, operation: string) {
	const columns = parameters.columns;
	if (!isRecord(columns)) return false;
	const columnValue = Reflect.get(columns, 'value');
	const matchingColumns = Reflect.get(columns, 'matchingColumns');
	const values = isRecord(columnValue) ? columnValue : columns;
	if (operation === 'append') {
		return (
			Reflect.get(values, 'Month') === '01/01/2027' &&
			String(Reflect.get(values, 'Amount $')) === '5000'
		);
	}
	if (operation === 'update') {
		return (
			Reflect.get(values, 'Order') === 'O-23523' &&
			Reflect.get(values, 'Status') === 'Shipped' &&
			Array.isArray(matchingColumns) &&
			matchingColumns.includes('Order')
		);
	}
	return false;
}

function currentTask() {
	const caseId = activeCase.getStore();
	return benchmarkTasks.find((task) => task.id === caseId);
}

export async function runWithNodeMcpEvalCase<T>(caseId: string | undefined, fn: () => Promise<T>) {
	if (!caseId || process.env.N8N_NODE_MCP_POC_EVAL_ENABLED !== 'true') return await fn();
	if (!benchmarkTasks.some((task) => task.id === caseId)) {
		throw new Error(`Unknown node MCP evaluation case: ${caseId}`);
	}
	return await activeCase.run(caseId, fn);
}

export function resolveNodeMcpEvalFixture(
	toolset: CompiledNodeToolset,
	tool: CompiledOperationTool,
	path: string,
	filter?: string,
): DynamicResolutionResult | undefined {
	const task = currentTask();
	if (!task) return undefined;
	if (toolset.endpoint.binding.nodeType === 'n8n-nodes-base.gmail') {
		if (tool.resource === 'message' && tool.operation === 'getAll' && path === 'filters.labelIds') {
			return {
				kind: 'options',
				appliesTo: path,
				values: [
					{ name: 'INBOX', value: 'INBOX' },
					{ name: 'UNREAD', value: 'UNREAD' },
				],
			};
		}
		return undefined;
	}
	if (toolset.endpoint.binding.nodeType !== 'n8n-nodes-base.googleSheets') return undefined;
	if (tool.resource !== 'sheet' || !['append', 'update'].includes(tool.operation ?? '')) {
		return undefined;
	}

	if (path === 'documentId') {
		const document = task.fixtures.document;
		if (!document) return undefined;
		const matches = !filter || document.name.toLowerCase().includes(filter.toLowerCase());
		return {
			kind: 'resourceLocator',
			appliesTo: path,
			values: matches ? [{ name: document.name, value: document.id }] : [],
		};
	}
	if (path === 'sheetName') {
		return {
			kind: 'resourceLocator',
			appliesTo: path,
			values: task.fixtures.sheets.map((sheet) => ({ name: sheet.name, value: sheet.id })),
		};
	}
	if (path === 'columns') {
		const fields: ResourceMapperField[] = task.fixtures.columns.map((column) => ({
			id: column.name,
			displayName: column.name,
			type: column.type,
			required: false,
			display: true,
			defaultMatch: false,
			canBeUsedToMatch: false,
			readOnly: false,
			removed: false,
		}));
		return { kind: 'resourceMapperFields', appliesTo: path, fields };
	}
	return undefined;
}

export function executeNodeMcpEvalFixture(
	toolset: CompiledNodeToolset,
	tool: CompiledOperationTool,
	parameters: INodeParameters,
) {
	const task = currentTask();
	if (!task) return undefined;
	const operationKey = `${tool.resource ?? 'unknown'}.${tool.operation ?? 'execute'}`;
	const operationOutput = task.fixtures.operationOutputs[operationKey];
	if (operationOutput) {
		return {
			status: 'success' as const,
			data: operationOutput.map((item) => ({ json: item })),
		};
	}
	if (
		toolset.endpoint.binding.nodeType === 'n8n-nodes-base.gmail' &&
		tool.resource === 'message' &&
		tool.operation === 'getAll'
	) {
		if (!isValidGmailFilter(parameters)) {
			return fixtureError('Evaluation fixture rejected incomplete Gmail filters');
		}
		return {
			status: 'success' as const,
			data: (task.fixtures.executionItems ?? []).map((item) => ({ json: item })),
		};
	}
	if (toolset.endpoint.binding.nodeType !== 'n8n-nodes-base.googleSheets') {
		return fixtureError(`No evaluation fixture for ${operationKey}`);
	}
	if (tool.resource !== 'sheet' || !['append', 'update'].includes(tool.operation ?? '')) {
		return fixtureError(`No evaluation fixture for ${operationKey}`);
	}
	if (!isValidSheetMutation(parameters, tool.operation ?? '')) {
		return fixtureError(`Evaluation fixture rejected invalid ${operationKey} input`);
	}

	return {
		status: 'success' as const,
		data: [
			{
				json: {
					...task.fixtures.executionOutput,
					receivedParameters: parameters,
				},
			},
		],
	};
}
