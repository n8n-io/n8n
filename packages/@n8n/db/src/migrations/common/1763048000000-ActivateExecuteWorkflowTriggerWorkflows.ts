import { ERROR_TRIGGER_NODE_TYPE, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type Node = {
	type: string;
	disabled?: boolean;
	parameters?: Record<string, unknown>;
};

type Workflow = {
	id: string;
	active: boolean;
	versionId: string;
	activeVersionId: string | null;
	nodes: string | Node[];
	connections: string;
};

/**
 * Activates all workflows that contain an executeWorkflowTrigger node with at least one parameter,
 * or an errorTrigger node. Also disables any other trigger nodes within those workflows.
 */
export class ActivateExecuteWorkflowTriggerWorkflows1763048000000 implements IrreversibleMigration {
	private findExecuteWfAndErrorTriggers(nodes: Node[]): {
		executeWorkflowTriggerNode: Node | undefined;
		errorTriggerNode: Node | undefined;
	} {
		let executeWorkflowTriggerNode: Node | undefined;
		let errorTriggerNode: Node | undefined;

		for (const node of nodes) {
			if (node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE) {
				executeWorkflowTriggerNode = node;
			} else if (node.type === ERROR_TRIGGER_NODE_TYPE) {
				errorTriggerNode = node;
			}

			// Early exit if both are found
			if (executeWorkflowTriggerNode && errorTriggerNode) {
				break;
			}
		}

		return { executeWorkflowTriggerNode, errorTriggerNode };
	}

	async up({ escape, runQuery, runInBatches, parseJson, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const historyTableName = escape.tableName('workflow_history');
		const idColumn = escape.columnName('id');
		const versionIdColumn = escape.columnName('versionId');
		const nodesColumn = escape.columnName('nodes');
		const connectionsColumn = escape.columnName('connections');
		const activeColumn = escape.columnName('active');
		const activeVersionIdColumn = escape.columnName('activeVersionId');
		const workflowIdColumn = escape.columnName('workflowId');
		const authorsColumn = escape.columnName('authors');
		const createdAtColumn = escape.columnName('createdAt');
		const updatedAtColumn = escape.columnName('updatedAt');

		const nodesColumnForLike = isPostgres ? `${nodesColumn}::text` : nodesColumn;

		const inactiveWorkflows = `SELECT ${idColumn}, ${nodesColumn}, ${connectionsColumn}, ${versionIdColumn}, ${activeVersionIdColumn} FROM ${tableName} WHERE ${activeColumn} = false AND (${nodesColumnForLike} LIKE '%n8n-nodes-base.executeWorkflowTrigger%' OR ${nodesColumnForLike} LIKE '%n8n-nodes-base.errorTrigger%')`;

		await runInBatches<Workflow>(inactiveWorkflows, async (workflows) => {
			for (const workflow of workflows) {
				const nodes = parseJson(workflow.nodes);

				const { executeWorkflowTriggerNode, errorTriggerNode } =
					this.findExecuteWfAndErrorTriggers(nodes);

				if (!executeWorkflowTriggerNode && !errorTriggerNode) {
					continue;
				}

				// Skip if both trigger nodes are disabled
				const executeWorkflowTriggerDisabled = executeWorkflowTriggerNode?.disabled === true;
				const errorTriggerDisabled = errorTriggerNode?.disabled === true;

				if (
					(!executeWorkflowTriggerNode || executeWorkflowTriggerDisabled) &&
					(!errorTriggerNode || errorTriggerDisabled)
				) {
					continue;
				}

				let hasValidExecuteWorkflowTrigger = false;
				if (executeWorkflowTriggerNode && !executeWorkflowTriggerDisabled) {
					const inputSource = executeWorkflowTriggerNode.parameters?.inputSource;

					const shouldActivateByInputSource =
						inputSource === 'passthrough' || inputSource === 'jsonExample';

					// For nodes without inputSource (version 1 or legacy version 1.1)
					let hasLegacyParametersOrIsVersion1 = false;
					if (!inputSource) {
						const params = executeWorkflowTriggerNode.parameters;
						// Version 1 nodes have no parameters at all - they should be activated
						if (!params || Object.keys(params).length === 0) {
							hasLegacyParametersOrIsVersion1 = true;
						} else {
							// Version 1.1 legacy: check if they have valid workflowInputs
							const workflowInputs = params.workflowInputs;
							hasLegacyParametersOrIsVersion1 = Boolean(
								workflowInputs &&
									typeof workflowInputs === 'object' &&
									'values' in workflowInputs &&
									Array.isArray(workflowInputs.values) &&
									workflowInputs.values.length > 0 &&
									this.hasValidWorkflowInputs(workflowInputs.values),
							);
						}
					}
					hasValidExecuteWorkflowTrigger =
						shouldActivateByInputSource || hasLegacyParametersOrIsVersion1;

					if (!hasValidExecuteWorkflowTrigger && !errorTriggerNode) {
						continue;
					}
				}

				// Disable other trigger nodes (keep valid executeWorkflowTrigger and errorTrigger enabled)
				let nodesModified = false;
				nodes.forEach((node: Node) => {
					if (node.type && this.isTriggerNode(node.type)) {
						// Keep valid Execute Workflow Trigger active
						if (
							node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE &&
							hasValidExecuteWorkflowTrigger
						) {
							return;
						}
						// Keep Error Trigger active
						if (node.type === ERROR_TRIGGER_NODE_TYPE) {
							return;
						}
						// Disable all other triggers (including invalid Execute Workflow Trigger)
						if (!node.disabled) {
							node.disabled = true;
							nodesModified = true;
						}
					}
				});

				if (nodesModified) {
					const newVersionId = randomUUID();

					// Create workflow_history record with the modified nodes
					await runQuery(
						`INSERT INTO ${historyTableName} (${versionIdColumn}, ${workflowIdColumn}, ${authorsColumn}, ${nodesColumn}, ${connectionsColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (:versionId, :workflowId, :authors, :nodes, :connections, :createdAt, :updatedAt)`,
						{
							versionId: newVersionId,
							workflowId: workflow.id,
							authors: 'system migration',
							nodes: JSON.stringify(nodes),
							connections: workflow.connections,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					);

					// Update workflow_entity with new versionId, modified nodes, and set as active
					await runQuery(
						`UPDATE ${tableName} SET ${activeColumn} = :active, ${nodesColumn} = :nodes, ${versionIdColumn} = :versionId, ${activeVersionIdColumn} = :activeVersionId WHERE ${idColumn} = :id`,
						{
							active: true,
							nodes: JSON.stringify(nodes),
							versionId: newVersionId,
							activeVersionId: newVersionId,
							id: workflow.id,
						},
					);
				} else {
					// No nodes modified, just activate with existing versionId
					await runQuery(
						`UPDATE ${tableName} SET ${activeColumn} = :active, ${activeVersionIdColumn} = :versionId WHERE ${idColumn} = :id`,
						{
							active: true,
							versionId: workflow.versionId,
							id: workflow.id,
						},
					);
				}
			}
		});
	}

	private isTriggerNode(nodeType: string): boolean {
		return nodeType.includes('Trigger');
	}

	private hasValidWorkflowInputs(values: unknown[]): boolean {
		return values.every(
			(value: unknown) =>
				value &&
				typeof value === 'object' &&
				'name' in value &&
				typeof value.name === 'string' &&
				value.name.length > 0 &&
				// type is optional (defaults to 'string' in version 1.1)
				(!('type' in value) || (typeof value.type === 'string' && value.type.length > 0)),
		);
	}
}
