import {
	ERROR_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	type INode,
} from 'n8n-workflow';

import type { WorkflowEntity } from '../../entities';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

type Workflow = Pick<WorkflowEntity, 'id' | 'active' | 'versionId' | 'activeVersionId'> & {
	nodes: string | INode[];
};

/**
 * Activates all workflows that contain an executeWorkflowTrigger node with at least one parameter,
 * or an errorTrigger node. Also disables any other trigger nodes within those workflows.
 */
export class ActivateExecuteWorkflowTriggerWorkflows1763048000000 implements ReversibleMigration {
	async up({ escape, runQuery, runInBatches, parseJson }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const idColumn = escape.columnName('id');
		const versionIdColumn = escape.columnName('versionId');
		const nodesColumn = escape.columnName('nodes');
		const activeColumn = escape.columnName('active');
		const activeVersionIdColumn = escape.columnName('activeVersionId');

		const inactiveWorkflows = `SELECT ${idColumn}, ${nodesColumn}, ${versionIdColumn}, ${activeVersionIdColumn} FROM ${tableName} WHERE ${activeColumn} = false`;

		await runInBatches<Workflow>(inactiveWorkflows, async (workflows) => {
			for (const workflow of workflows) {
				const nodes = parseJson(workflow.nodes);

				// Check if workflow contains executeWorkflowTrigger node with at least one parameter
				const executeWorkflowTriggerNode = nodes.find(
					(node: INode) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				);

				// Check if workflow contains errorTrigger node
				const errorTriggerNode = nodes.find((node: INode) => node.type === ERROR_TRIGGER_NODE_TYPE);

				// Skip if workflow doesn't have either trigger type
				if (!executeWorkflowTriggerNode && !errorTriggerNode) {
					continue;
				}

				// For executeWorkflowTrigger, check if the node has at least one parameter defined in workflowInputs.values
				if (executeWorkflowTriggerNode) {
					const workflowInputs = executeWorkflowTriggerNode.parameters?.workflowInputs;
					const hasParameters =
						workflowInputs &&
						typeof workflowInputs === 'object' &&
						'values' in workflowInputs &&
						Array.isArray(workflowInputs.values) &&
						workflowInputs.values.length > 0 &&
						this.hasValidWorkflowInputs(workflowInputs.values);

					if (!hasParameters) {
						continue;
					}
				}

				// Disable other trigger nodes
				let nodesModified = false;
				nodes.forEach((node: INode) => {
					// Check if node is a trigger (excluding executeWorkflowTrigger and errorTrigger)
					if (
						node.type !== EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE &&
						node.type !== ERROR_TRIGGER_NODE_TYPE &&
						this.isTriggerNode(node.type)
					) {
						if (!node.disabled) {
							node.disabled = true;
							nodesModified = true;
						}
					}
				});

				// Update workflow: set active = true and update nodes if needed
				if (nodesModified) {
					await runQuery(
						`UPDATE ${tableName} SET ${activeColumn} = :active, ${nodesColumn} = :nodes, ${activeVersionIdColumn} = :versionId WHERE ${idColumn} = :id`,
						{
							active: true,
							nodes: JSON.stringify(nodes),
							versionId: workflow.versionId,
							id: workflow.id,
						},
					);
				} else {
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

	async down({ escape, runQuery, runInBatches, parseJson }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const id = escape.columnName('id');
		const versionId = escape.columnName('versionId');
		const nodes = escape.columnName('nodes');
		const active = escape.columnName('active');
		const workflowsQuery = `SELECT ${id}, ${versionId}, ${nodes} FROM ${tableName} WHERE ${active} = true`;

		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			for (const workflow of workflows) {
				const nodes = parseJson(workflow.nodes);

				// Check if workflow contains executeWorkflowTrigger or errorTrigger node
				const hasExecuteWorkflowTrigger = nodes.some(
					(node: INode) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				);

				const hasErrorTrigger = nodes.some((node: INode) => node.type === ERROR_TRIGGER_NODE_TYPE);

				if (!hasExecuteWorkflowTrigger && !hasErrorTrigger) {
					continue;
				}

				// Deactivate the workflow
				await runQuery(`UPDATE ${tableName} SET ${active} = :active WHERE ${id} = :id`, {
					active: false,
					id: workflow.id,
				});
			}
		});
	}

	/**
	 * Determines if a node type is a trigger based on its type name.
	 */
	private isTriggerNode(nodeType: string): boolean {
		return nodeType.includes('Trigger');
	}

	/**
	 * Validates that all workflow input values have both name and type properties.
	 */
	private hasValidWorkflowInputs(values: unknown[]): boolean {
		return values.every(
			(value: unknown) =>
				value &&
				typeof value === 'object' &&
				'name' in value &&
				typeof value.name === 'string' &&
				value.name.length > 0 &&
				'type' in value &&
				typeof value.type === 'string' &&
				value.type.length > 0,
		);
	}
}
