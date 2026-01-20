/**
 * Data Table Helpers
 *
 * Utility functions for extracting and processing Data Table information
 * from workflow JSON for use in the responder agent.
 */

import type { DataTableRowOperation } from 'n8n-workflow';

import type { SimpleWorkflow } from '../types/workflow';

export const DATA_TABLE_NODE_TYPE = 'n8n-nodes-base.dataTable';
export const SET_NODE_TYPE = 'n8n-nodes-base.set';

// Re-export type from n8n-workflow for convenience
export type { DataTableRowOperation };

/** Row operations that require column definitions (from a preceding Set node) */
export const DATA_TABLE_ROW_COLUMN_MAPPING_OPERATIONS: readonly DataTableRowOperation[] = [
	'insert',
	'update',
	'upsert',
];

export type DataTableRowColumnOperation = (typeof DATA_TABLE_ROW_COLUMN_MAPPING_OPERATIONS)[number];

/** Type guard to check if an operation requires column definitions */
export function isDataTableRowColumnOperation(
	operation: string,
): operation is DataTableRowColumnOperation {
	return (DATA_TABLE_ROW_COLUMN_MAPPING_OPERATIONS as readonly string[]).includes(operation);
}

/**
 * Column definition with name and type
 */
export interface ColumnDefinition {
	name: string;
	type: string;
}

/**
 * Information about a Data Table node in the workflow
 */
export interface DataTableInfo {
	/** The node name in the workflow */
	nodeName: string;
	/** The table name/ID (may be a placeholder) */
	tableName: string;
	/** Column definitions inferred from the preceding Set node */
	columns: ColumnDefinition[];
	/** The name of the Set node that defines the columns (if found) */
	setNodeName: string | null;
	/** The operation (insert, update, upsert, get, delete) */
	operation: string;
}

/**
 * Find nodes that connect to a target node
 */
export function findPredecessorNodes(workflow: SimpleWorkflow, targetNodeName: string): string[] {
	const predecessors: string[] = [];

	for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
		if (!outputs.main) continue;

		for (const connections of outputs.main) {
			if (!connections) continue;
			for (const connection of connections) {
				if (connection.node === targetNodeName) {
					predecessors.push(sourceName);
				}
			}
		}
	}

	return predecessors;
}

/**
 * Map Set node field types to Data Table column types
 */
function mapSetNodeTypeToDataTableType(setNodeType: string): string {
	switch (setNodeType) {
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'string':
		default:
			return 'text';
	}
}

/**
 * Extract field definitions from a Set node's assignments
 */
export function extractSetNodeFields(
	workflow: SimpleWorkflow,
	nodeName: string,
): ColumnDefinition[] {
	const node = workflow.nodes.find((n) => n.name === nodeName && n.type === SET_NODE_TYPE);
	if (!node) return [];

	const params = node.parameters ?? {};
	const assignments = params.assignments as
		| { assignments?: Array<{ name: string; type: string }> }
		| undefined;

	if (!assignments?.assignments) return [];

	return assignments.assignments
		.filter((a) => a.name && a.type)
		.map((a) => ({
			name: a.name,
			type: mapSetNodeTypeToDataTableType(a.type),
		}));
}

/**
 * Extract data table information from workflow nodes.
 * Used to inform users about data tables they need to create manually.
 *
 * For row write operations (insert, update, upsert), the configurator agent
 * is instructed to place a Set node before Data Table nodes. This function
 * infers column definitions from the preceding Set node.
 *
 * For read operations (get, getAll, delete), no Set node is expected.
 */
export function extractDataTableInfo(workflow: SimpleWorkflow): DataTableInfo[] {
	const dataTableNodes = workflow.nodes.filter((node) => node.type === DATA_TABLE_NODE_TYPE);

	return dataTableNodes.map((node) => {
		const params = node.parameters ?? {};

		// Extract table name from dataTableId parameter
		// The structure is: { __rl: true, mode: 'id', value: 'tableName' }
		let tableName = 'unknown';
		const dataTableId = params.dataTableId as { value?: string } | undefined;
		if (dataTableId?.value) {
			tableName = dataTableId.value;
		}

		// Get the operation type
		const operation = (params.operation as string) ?? 'insert';

		// Only look for Set node columns on row write operations
		let columns: ColumnDefinition[] = [];
		let setNodeName: string | null = null;

		if (isDataTableRowColumnOperation(operation)) {
			const predecessors = findPredecessorNodes(workflow, node.name);
			for (const predecessorName of predecessors) {
				const setFields = extractSetNodeFields(workflow, predecessorName);
				if (setFields.length > 0) {
					columns = setFields;
					setNodeName = predecessorName;
					break;
				}
			}
		}

		return {
			nodeName: node.name,
			tableName,
			columns,
			setNodeName,
			operation,
		};
	});
}
