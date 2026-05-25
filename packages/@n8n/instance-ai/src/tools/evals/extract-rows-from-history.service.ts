import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IConnection, IConnections } from 'n8n-workflow';
import { getParentNodes, mapConnectionsByDestination, NodeConnectionTypes } from 'n8n-workflow';

import { isRecord, nodeHasName, nodeTypeEndsWith, unique } from './column-ref-utils';
import { EXPECTED_TOOLS_COLUMN } from './metric-catalog';
import type { InstanceAiContext, NodeOutputResult } from '../../types';

const SCAN_LIMIT = 100;
const MAX_ROWS = 25;

export interface ExtractRowsInput {
	workflow: WorkflowJSON;
	workflowId: string;
	agentNodeName: string;
	inputColumns: string[];
	expectedToActualPairs: Array<{ expectedColumn: string; actualField: string }>;
}

export interface ExtractRowsResult {
	rows: Array<Record<string, string>>;
	scannedExecutions: number;
}

function isEvaluationNode(workflow: WorkflowJSON, nodeName: string): boolean {
	const node = workflow.nodes.find(
		(candidate) => nodeHasName(candidate) && candidate.name === nodeName,
	);
	return (
		node !== undefined &&
		(nodeTypeEndsWith(node, 'evaluation') || nodeTypeEndsWith(node, 'evaluationTrigger'))
	);
}

function toWorkflowMainConnections(connections: WorkflowJSON['connections']): IConnections {
	const result: IConnections = {};

	for (const [sourceName, byType] of Object.entries(connections ?? {})) {
		if (!isRecord(byType)) continue;
		const main = byType.main;
		if (!Array.isArray(main)) continue;

		const mainConnections: Array<IConnection[] | null> = [];
		for (const slot of main) {
			if (!Array.isArray(slot)) {
				mainConnections.push(null);
				continue;
			}

			const slotConnections: IConnection[] = [];
			for (const connection of slot) {
				if (!isRecord(connection)) continue;
				const node = connection.node;
				const type = connection.type;
				const index = connection.index;
				if (typeof node !== 'string') continue;
				if (type !== undefined && type !== NodeConnectionTypes.Main) continue;
				if (index !== undefined && typeof index !== 'number') continue;

				slotConnections.push({
					node,
					type: NodeConnectionTypes.Main,
					index: typeof index === 'number' ? index : 0,
				});
			}
			mainConnections.push(slotConnections);
		}

		result[sourceName] = { [NodeConnectionTypes.Main]: mainConnections };
	}

	return result;
}

function findParentNodeCandidates(workflow: WorkflowJSON, targetNodeName: string): string[] {
	const connectionsByDestination = mapConnectionsByDestination(
		toWorkflowMainConnections(workflow.connections),
	);
	const parents = getParentNodes(
		connectionsByDestination,
		targetNodeName,
		NodeConnectionTypes.Main,
		1,
	);
	const productionParents = parents.filter((parent) => !isEvaluationNode(workflow, parent));
	const evalParents = parents.filter((parent) => isEvaluationNode(workflow, parent));
	return [...productionParents, ...evalParents];
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
			const projected = projectExpectedValue(expectedColumn, value);
			if (projected === undefined) return undefined;
			row[expectedColumn] = projected;
		}
	}

	return row;
}

function projectExpectedValue(expectedColumn: string, value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (expectedColumn === EXPECTED_TOOLS_COLUMN) return formatExpectedTools(value);
	return typeof value === 'string' ? value : JSON.stringify(value);
}

function formatExpectedTools(value: unknown): string | undefined {
	if (!Array.isArray(value)) return undefined;
	const tools = unique(
		value.flatMap((step) => {
			const tool = isRecord(step) && isRecord(step.action) ? step.action.tool : undefined;
			return typeof tool === 'string' && tool.trim().length > 0 ? [tool.trim()] : [];
		}),
	);
	return tools.length > 0 ? tools.join(', ') : undefined;
}

export async function extractRowsFromExecutionHistory(
	ctx: InstanceAiContext,
	input: ExtractRowsInput,
): Promise<ExtractRowsResult> {
	const parentNodeNames = findParentNodeCandidates(input.workflow, input.agentNodeName);
	if (parentNodeNames.length === 0) {
		return { rows: [], scannedExecutions: 0 };
	}

	const [successSummaries, errorSummaries] = await Promise.all([
		ctx.executionService.list({
			workflowId: input.workflowId,
			status: 'success',
			limit: SCAN_LIMIT,
		}),
		ctx.executionService.list({
			workflowId: input.workflowId,
			status: 'error',
			limit: SCAN_LIMIT,
		}),
	]);
	const summaries = [...successSummaries, ...errorSummaries];

	const rows: Array<Record<string, string>> = [];
	const seenRows = new Set<string>();
	let scannedExecutions = 0;

	for (const summary of summaries) {
		if (rows.length >= MAX_ROWS) break;

		let agentOutput: NodeOutputResult | undefined;
		if (input.expectedToActualPairs.length > 0) {
			try {
				agentOutput = await ctx.executionService.getNodeOutput(summary.id, input.agentNodeName, {
					maxItems: 1,
				});
			} catch (error) {
				ctx.logger?.warn('extract-rows: getNodeOutput failed', {
					executionId: summary.id,
					nodeName: input.agentNodeName,
					error,
				});
				continue;
			}
		}

		const agentItem = agentOutput?.items[0];
		const agentJson = agentItem !== undefined && isRecord(agentItem) ? agentItem.json : undefined;

		let scannedExecution = false;
		let row: Record<string, string> | undefined;
		for (const parentNodeName of parentNodeNames) {
			let parentOutput: NodeOutputResult | undefined;
			try {
				parentOutput = await ctx.executionService.getNodeOutput(summary.id, parentNodeName, {
					maxItems: 1,
				});
			} catch (error) {
				ctx.logger?.warn('extract-rows: getNodeOutput failed', {
					executionId: summary.id,
					nodeName: parentNodeName,
					error,
				});
				continue;
			}

			scannedExecution = true;
			const parentItem = parentOutput.items[0];
			const parentJson = isRecord(parentItem) ? parentItem.json : undefined;
			row = projectRow(parentJson, agentJson, input.inputColumns, input.expectedToActualPairs);
			if (row) break;
		}

		if (scannedExecution) scannedExecutions++;
		if (!row) continue;

		const key = JSON.stringify(row);
		if (seenRows.has(key)) continue;
		seenRows.add(key);
		rows.push(row);
	}

	return { rows, scannedExecutions };
}
