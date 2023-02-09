import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import { NodeTypes } from '@/NodeTypes';
import { IConnections, INode } from 'n8n-workflow';

export class PurgeInvalidWorkflowConnections1675940580449 implements MigrationInterface {
	name = 'PurgeInvalidWorkflowConnections1675940580449';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		const workflows: Array<{ id: number; nodes: string; connections: string }> =
			await queryRunner.query(`
			SELECT id, nodes, connections
			FROM ${tablePrefix}workflow_entity
		`);

		const nodeTypes = NodeTypes();

		workflows.forEach(async (workflow) => {
			let connections: IConnections = JSON.parse(workflow.connections);
			const nodes: INode[] = JSON.parse(workflow.nodes);

			const nodesThatCannotReceiveInput: string[] = nodes.reduce((acc, node) => {
				const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
				if ((nodeType.description.inputs?.length ?? []) === 0) {
					acc.push(node.name);
				}
				return acc;
			}, [] as string[]);

			Object.keys(connections).forEach((sourceNodeName) => {
				const connection = connections[sourceNodeName];
				const outputs = Object.keys(connection);

				outputs.forEach((outputConnectionName /* Like `main` */, idx) => {
					const outputConnection = connection[outputConnectionName];

					// It removes all connections that are connected to a node that cannot receive input
					outputConnection.forEach((outputConnectionItem, outputConnectionItemIdx) => {
						outputConnection[outputConnectionItemIdx] = outputConnectionItem.filter(
							(outgoingConnections) => {
								return !nodesThatCannotReceiveInput.includes(outgoingConnections.node);
							},
						);
					});
					connection[outputConnectionName] = connection[outputConnectionName].filter((item) => {
						return item.length > 0;
					});
					if (connection[outputConnectionName].length === 0) {
						delete connection[outputConnectionName];
					}
				});

				if (Object.keys(connection).length === 0) {
					delete connections[sourceNodeName];
				}
			});


			// Update database with new connections
			const [updateQuery, updateParams] =
				queryRunner.connection.driver.escapeQueryWithParameters(
					`
						UPDATE ${tablePrefix}workflow_entity
						SET connections = :connections
						WHERE id = '${workflow.id}'
					`,
					{ connections: JSON.stringify(connections) },
					{},
				);

			await queryRunner.query(updateQuery, updateParams);
		});

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// No need to revert this migration
	}
}
