import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isRecord } from './column-ref-utils';
import type { InstanceAiContext, NodeOutputResult } from '../../types';

const SCAN_LIMIT = 100;
const MAX_ROWS = 25;

export interface ExtractRowsInput {
	workflow: WorkflowJSON;
	workflowId: string;
	agentNodeName: string;
	inputColumns: string[];
	/**
	 * For each expected_* column, the agent output field whose value should
	 * be projected into that column. Empty array means no expected columns
	 * to populate from history.
	 */
	expectedToActualPairs: Array<{ expectedColumn: string; actualField: string }>;
}

export interface ExtractRowsResult {
	rows: Array<Record<string, string>>;
	scannedExecutions: number;
}

function findParentNode(workflow: WorkflowJSON, targetNodeName: string): string | undefined {
	const connections = workflow.connections ?? {};
	for (const [sourceName, byType] of Object.entries(connections)) {
		if (!isRecord(byType)) continue;
		const main = byType.main;
		if (!Array.isArray(main)) continue;
		for (const slot of main) {
			if (!Array.isArray(slot)) continue;
			for (const conn of slot) {
				if (isRecord(conn) && conn.node === targetNodeName) {
					return sourceName;
				}
			}
		}
	}
	return undefined;
}

function projectRow(
	parentJson: unknown,
	agentJson: unknown,
	inputColumns: string[],
	expectedToActualPairs: Array<{ expectedColumn: string; actualField: string }>,
): Record<string, string> | undefined {
	if (!isRecord(parentJson)) return undefined;
	const row: Record<string, string> = {};

	for (const col of inputColumns) {
		const value = parentJson[col];
		if (value === undefined || value === null) return undefined;
		row[col] = typeof value === 'string' ? value : JSON.stringify(value);
	}

	if (expectedToActualPairs.length > 0) {
		if (!isRecord(agentJson)) return undefined;
		for (const { expectedColumn, actualField } of expectedToActualPairs) {
			const value = agentJson[actualField];
			if (value === undefined || value === null) return undefined;
			row[expectedColumn] = typeof value === 'string' ? value : JSON.stringify(value);
		}
	}

	return row;
}

function rowKey(row: Record<string, string>): string {
	return JSON.stringify(row);
}

export async function extractRowsFromExecutionHistory(
	ctx: InstanceAiContext,
	input: ExtractRowsInput,
): Promise<ExtractRowsResult> {
	const parentNodeName = findParentNode(input.workflow, input.agentNodeName);
	if (!parentNodeName) {
		return { rows: [], scannedExecutions: 0 };
	}

	const summaries = await ctx.executionService.list({
		workflowId: input.workflowId,
		status: 'success',
		limit: SCAN_LIMIT,
	});

	const rows: Array<Record<string, string>> = [];
	const seenRows = new Set<string>();
	let scannedExecutions = 0;

	for (const summary of summaries) {
		if (rows.length >= MAX_ROWS) break;

		let parentOutput: NodeOutputResult | undefined;
		let agentOutput: NodeOutputResult | undefined;
		try {
			parentOutput = await ctx.executionService.getNodeOutput(summary.id, parentNodeName, {
				maxItems: 1,
			});
			if (input.expectedToActualPairs.length > 0) {
				agentOutput = await ctx.executionService.getNodeOutput(summary.id, input.agentNodeName, {
					maxItems: 1,
				});
			}
		} catch (error) {
			ctx.logger?.warn('extract-rows: getNodeOutput failed', {
				executionId: summary.id,
				error,
			});
			continue;
		}
		scannedExecutions++;

		const parentItem = parentOutput.items[0];
		const parentJson = isRecord(parentItem) ? parentItem.json : undefined;
		const agentItem = agentOutput?.items[0];
		const agentJson = agentItem !== undefined && isRecord(agentItem) ? agentItem.json : undefined;

		const row = projectRow(parentJson, agentJson, input.inputColumns, input.expectedToActualPairs);
		if (!row) continue;
		const key = rowKey(row);
		if (seenRows.has(key)) continue;
		seenRows.add(key);
		rows.push(row);
	}

	return { rows, scannedExecutions };
}
