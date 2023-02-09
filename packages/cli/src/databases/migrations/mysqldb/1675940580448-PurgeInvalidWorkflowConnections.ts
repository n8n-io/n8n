import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import { NodeTypes } from '@/NodeTypes';
import { IConnections, INode } from 'n8n-workflow';

// {
//   "meta": {
//     "instanceId": "a5280676597d00ecd0ea712da7f9cf2ce90174a791a309112731f6e44d162f35"
//   },
//   "nodes": [
//     {
//       "parameters": {},
//       "id": "c5384fdd-5e97-4633-98d2-0eb4ca6c7b9a",
//       "name": "When clicking \"Execute Workflow\"",
//       "type": "n8n-nodes-base.manualTrigger",
//       "typeVersion": 1,
//       "position": [
//         320,
//         580
//       ]
//     },
//     {
//       "parameters": {
//         "options": {}
//       },
//       "id": "09fe4ca5-4e3c-404a-8df7-295929489dd3",
//       "name": "Set",
//       "type": "n8n-nodes-base.set",
//       "typeVersion": 1,
//       "position": [
//         640,
//         440
//       ]
//     },
//     {
//       "parameters": {
//         "rule": {
//           "interval": [
//             {}
//           ]
//         }
//       },
//       "id": "973833cf-bac9-431a-bef0-8542f615ff6a",
//       "name": "Schedule Trigger",
//       "type": "n8n-nodes-base.scheduleTrigger",
//       "typeVersion": 1,
//       "position": [
//         560,
//         840
//       ]
//     },
//     {
//       "parameters": {
//         "rule": {
//           "interval": [
//             {}
//           ]
//         }
//       },
//       "id": "db658570-4e17-4696-bae9-04bd2b9c3ff5",
//       "name": "Schedule Trigger1",
//       "type": "n8n-nodes-base.scheduleTrigger",
//       "typeVersion": 1,
//       "position": [
//         860,
//         820
//       ]
//     },
//     {
//       "parameters": {
//         "options": {}
//       },
//       "id": "93581470-e983-4a45-8066-051cd6729d34",
//       "name": "Set1",
//       "type": "n8n-nodes-base.set",
//       "typeVersion": 1,
//       "position": [
//         880,
//         340
//       ]
//     },
//     {
//       "parameters": {
//         "rule": {
//           "interval": [
//             {}
//           ]
//         }
//       },
//       "id": "16ba70bf-3780-4b9c-9cbe-1178da5ff6d5",
//       "name": "Schedule Trigger2",
//       "type": "n8n-nodes-base.scheduleTrigger",
//       "typeVersion": 1,
//       "position": [
//         820,
//         600
//       ]
//     }
//   ],
//   "connections": {
//     "When clicking \"Execute Workflow\"": {
//       "main": [
//         [
//           {
//             "node": "Set",
//             "type": "main",
//             "index": 0
//           }
//         ]
//       ]
//     },
//     "Set": {
//       "main": [
//         [
//           {
//             "node": "Schedule Trigger1",
//             "type": "main",
//             "index": 0
//           },
//           {
//             "node": "Set1",
//             "type": "main",
//             "index": 0
//           },
//           {
//             "node": "Schedule Trigger2",
//             "type": "main",
//             "index": 0
//           }
//         ]
//       ]
//     }
//   }
// }
export class PurgeInvalidWorkflowConnections1675940580448 implements MigrationInterface {
	name = 'PurgeInvalidWorkflowConnections1675940580448';

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
			const connections: IConnections = JSON.parse(workflow.connections);
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
				console.log(
					'🚀 ~ file: 1675940580448-PurgeInvalidWorkflowConnections.ts:165 ~ PurgeInvalidWorkflowConnections1675940580448 ~ Object.keys ~ connection',
					connection,
				);

				const outputs = Object.keys(connection);

				outputs.forEach((outputConnectionName /* Like `main` */, idx) => {
					const outputConnection = connection[outputConnectionName];

					// It removes all connections that are connected to a node that cannot receive input
					outputConnection.forEach((outputConnectionItem, outputConnectionItemIdx) => {
						outputConnection[outputConnectionItemIdx] = outputConnectionItem.filter(
							(outgoingConnections, outgoingConnectionIndex) => {
								return !nodesThatCannotReceiveInput.includes(outgoingConnections.node);
							},
						);
					});
				});

				console.log("Connection after mutation: ", connection)
			});
		});

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		// await queryRunner.query(`DROP TABLE \`${tablePrefix}auth_provider_sync_history\``);
		// await queryRunner.query(`DROP TABLE \`${tablePrefix}auth_identity\``);

		// await queryRunner.query(
		// 	`DELETE FROM ${tablePrefix}settings WHERE \`key\` = '${LDAP_FEATURE_NAME}'`,
		// );
		// await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN disabled`);
	}
}
