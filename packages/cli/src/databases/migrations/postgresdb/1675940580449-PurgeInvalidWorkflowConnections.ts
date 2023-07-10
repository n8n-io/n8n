import type { IConnections, INode } from 'n8n-workflow';
import type { MigrationContext, IrreversibleMigration } from '@db/types';
import { NodeTypes } from '@/NodeTypes';
import { Container } from 'typedi';

export class PurgeInvalidWorkflowConnections1675940580449 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix, migrationName, logger }: MigrationContext) {
		const workflows = (await queryRunner.query(`
			SELECT id, nodes, connections
			FROM "${tablePrefix}workflow_entity"
		`)) as Array<{ id: number; nodes: INode[]; connections: IConnections }>;

		const nodeTypes = Container.get(NodeTypes);

		workflows.forEach(async (workflow) => {
			const { connections, nodes } = workflow;

			const nodesThatCannotReceiveInput: string[] = nodes.reduce((acc, node) => {
				try {
					const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
					if ((nodeType.description.inputs?.length ?? []) === 0) {
						acc.push(node.name);
					}
				} catch (error) {
					logger.warn(`Migration ${migrationName} failed with error: ${(error as Error).message}`);
				}
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
			const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
				`UPDATE "${tablePrefix}workflow_entity"
					SET connections = :connections
					WHERE id = '${workflow.id}'`,
				{ connections: JSON.stringify(connections) },
				{},
			);

			await queryRunner.query(updateQuery, updateParams);
		});
	}
}
