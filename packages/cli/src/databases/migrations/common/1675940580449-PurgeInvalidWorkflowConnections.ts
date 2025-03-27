import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { MigrationContext, IrreversibleMigration } from '@/databases/types';

interface Workflow {
	id: number;
	nodes: WorkflowEntity['nodes'] | string;
	connections: WorkflowEntity['connections'] | string;
}

export class PurgeInvalidWorkflowConnections1675940580449 implements IrreversibleMigration {
	async up({ escape, parseJson, runQuery, nodeTypes }: MigrationContext) {
		const workflowsTable = escape.tableName('workflow_entity');
		const workflows: Workflow[] = await runQuery(
			`SELECT id, nodes, connections FROM ${workflowsTable}`,
		);

		await Promise.all(
			workflows.map(async (workflow) => {
				const connections = parseJson(workflow.connections);
				const nodes = parseJson(workflow.nodes);

				const nodesThatCannotReceiveInput = nodes.reduce<string[]>((acc, node) => {
					try {
						const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
						if ((nodeType.description.inputs?.length ?? []) === 0) {
							acc.push(node.name);
						}
					} catch (error) {}
					return acc;
				}, []);

				Object.keys(connections).forEach((sourceNodeName) => {
					const connection = connections[sourceNodeName];
					const outputs = Object.keys(connection);

					outputs.forEach((outputConnectionName /* Like `main` */) => {
						const outputConnection = connection[outputConnectionName];

						// It filters out all connections that are connected to a node that cannot receive input
						outputConnection.forEach((outputConnectionItem, outputConnectionItemIdx) => {
							outputConnection[outputConnectionItemIdx] = (outputConnectionItem ?? []).filter(
								(outgoingConnections) =>
									!nodesThatCannotReceiveInput.includes(outgoingConnections.node),
							);
						});
					});
				});

				// Update database with new connections
				return await runQuery(
					`UPDATE ${workflowsTable} SET connections = :connections WHERE id = :id`,
					{
						connections: JSON.stringify(connections),
						id: workflow.id,
					},
				);
			}),
		);
	}
}
