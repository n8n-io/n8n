import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { MigrationContext, IrreversibleMigration } from '@db/types';

interface Workflow {
	id: number;
	nodes: WorkflowEntity['nodes'] | string;
	connections: WorkflowEntity['connections'] | string;
}

export class PurgeInvalidWorkflowConnections1675940580449 implements IrreversibleMigration {
	async up({ escape, parseJson, executeQuery, nodeTypes }: MigrationContext) {
		const workflowsTable = escape.tableName('workflow_entity');
		const workflows: Workflow[] = await executeQuery(
			`SELECT id, nodes, connections FROM ${workflowsTable}`,
		);

		await Promise.all(
			workflows.map(async (workflow) => {
				const connections = parseJson(workflow.connections);
				const nodes = parseJson(workflow.nodes);

				const nodesThatCannotReceiveInput: string[] = nodes.reduce((acc, node) => {
					try {
						const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
						if ((nodeType.description.inputs?.length ?? []) === 0) {
							acc.push(node.name);
						}
					} catch (error) {}
					return acc;
				}, [] as string[]);

				Object.keys(connections).forEach((sourceNodeName) => {
					const connection = connections[sourceNodeName];
					const outputs = Object.keys(connection);

					outputs.forEach((outputConnectionName /* Like `main` */) => {
						const outputConnection = connection[outputConnectionName];

						// It filters out all connections that are connected to a node that cannot receive input
						outputConnection.forEach((outputConnectionItem, outputConnectionItemIdx) => {
							outputConnection[outputConnectionItemIdx] = outputConnectionItem.filter(
								(outgoingConnections) =>
									!nodesThatCannotReceiveInput.includes(outgoingConnections.node),
							);
						});
					});
				});

				// Update database with new connections
				return executeQuery(
					`UPDATE ${workflowsTable} SET connections = :connections WHERE id = :id`,
					{ connections: JSON.stringify(connections) },
					{ id: workflow.id },
				);
			}),
		);
	}
}
