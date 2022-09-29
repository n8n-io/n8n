import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { runInBatches } from '../../utils/migrationHelpers';

// replacing the credentials in workflows and execution
// `nodeType: name` changes to `nodeType: { id, name }`

export class UpdateWorkflowCredentials1630419189837 implements MigrationInterface {
	name = 'UpdateWorkflowCredentials1630419189837';

	public async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		const credentialsEntities = await queryRunner.query(`
			SELECT id, name, type
			FROM ${tablePrefix}credentials_entity
		`);

		const workflowsQuery = `
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`;

		// @ts-ignore
		await runInBatches(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = workflow.nodes;
				let credentialsUpdated = false;
				// @ts-ignore
				nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, name] of allNodeCredentials) {
							if (typeof name === 'string') {
								const matchingCredentials = credentialsEntities.find(
									// @ts-ignore
									(credentials) => credentials.name === name && credentials.type === type,
								);
								node.credentials[type] = { id: matchingCredentials?.id.toString() || null, name };
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					const [updateQuery, updateParams] =
						queryRunner.connection.driver.escapeQueryWithParameters(
							`
								UPDATE ${tablePrefix}workflow_entity
								SET nodes = :nodes
								WHERE id = '${workflow.id}'
							`,
							{ nodes: JSON.stringify(nodes) },
							{},
						);

					queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const waitingExecutionsQuery = `
			SELECT id, "workflowData"
			FROM ${tablePrefix}execution_entity
			WHERE "waitTill" IS NOT NULL AND finished = FALSE
		`;
		// @ts-ignore
		await runInBatches(queryRunner, waitingExecutionsQuery, (waitingExecutions) => {
			waitingExecutions.forEach(async (execution) => {
				const data = execution.workflowData;
				let credentialsUpdated = false;
				// @ts-ignore
				data.nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, name] of allNodeCredentials) {
							if (typeof name === 'string') {
								const matchingCredentials = credentialsEntities.find(
									// @ts-ignore
									(credentials) => credentials.name === name && credentials.type === type,
								);
								node.credentials[type] = { id: matchingCredentials?.id.toString() || null, name };
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					const [updateQuery, updateParams] =
						queryRunner.connection.driver.escapeQueryWithParameters(
							`
							UPDATE ${tablePrefix}execution_entity
							SET "workflowData" = :data
							WHERE id = '${execution.id}'
						`,
							{ data: JSON.stringify(data) },
							{},
						);

					queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const retryableExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM ${tablePrefix}execution_entity
			WHERE "waitTill" IS NULL AND finished = FALSE AND mode != 'retry'
			ORDER BY "startedAt" DESC
			LIMIT 200
		`);

		// @ts-ignore
		retryableExecutions.forEach(async (execution) => {
			const data = execution.workflowData;
			let credentialsUpdated = false;
			// @ts-ignore
			data.nodes.forEach((node) => {
				if (node.credentials) {
					const allNodeCredentials = Object.entries(node.credentials);
					for (const [type, name] of allNodeCredentials) {
						if (typeof name === 'string') {
							// @ts-ignore
							const matchingCredentials = credentialsEntities.find(
								// @ts-ignore
								(credentials) => credentials.name === name && credentials.type === type,
							);
							node.credentials[type] = { id: matchingCredentials?.id.toString() || null, name };
							credentialsUpdated = true;
						}
					}
				}
			});
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
					`
				UPDATE ${tablePrefix}execution_entity
				SET "workflowData" = :data
				WHERE id = '${execution.id}'
				`,
					{ data: JSON.stringify(data) },
					{},
				);

				queryRunner.query(updateQuery, updateParams);
			}
		});
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`SET search_path TO ${schema};`);

		const credentialsEntities = await queryRunner.query(`
			SELECT id, name, type
			FROM ${tablePrefix}credentials_entity
		`);

		const workflowsQuery = `
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`;
		// @ts-ignore
		await runInBatches(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = workflow.nodes;
				let credentialsUpdated = false;
				// @ts-ignore
				nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, creds] of allNodeCredentials) {
							if (typeof creds === 'object') {
								// @ts-ignore
								const matchingCredentials = credentialsEntities.find(
									// @ts-ignore
									(credentials) => credentials.id === creds.id && credentials.type === type,
								);
								if (matchingCredentials) {
									node.credentials[type] = matchingCredentials.name;
								} else {
									// @ts-ignore
									node.credentials[type] = creds.name;
								}
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					const [updateQuery, updateParams] =
						queryRunner.connection.driver.escapeQueryWithParameters(
							`
								UPDATE ${tablePrefix}workflow_entity
								SET nodes = :nodes
								WHERE id = '${workflow.id}'
							`,
							{ nodes: JSON.stringify(nodes) },
							{},
						);

					queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const waitingExecutionsQuery = `
			SELECT id, "workflowData"
			FROM ${tablePrefix}execution_entity
			WHERE "waitTill" IS NOT NULL AND finished = FALSE
		`;
		// @ts-ignore
		await runInBatches(queryRunner, waitingExecutionsQuery, (waitingExecutions) => {
			waitingExecutions.forEach(async (execution) => {
				const data = execution.workflowData;
				let credentialsUpdated = false;
				// @ts-ignore
				data.nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, creds] of allNodeCredentials) {
							if (typeof creds === 'object') {
								// @ts-ignore
								const matchingCredentials = credentialsEntities.find(
									// @ts-ignore
									(credentials) => credentials.id === creds.id && credentials.type === type,
								);
								if (matchingCredentials) {
									node.credentials[type] = matchingCredentials.name;
								} else {
									// @ts-ignore
									node.credentials[type] = creds.name;
								}
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					const [updateQuery, updateParams] =
						queryRunner.connection.driver.escapeQueryWithParameters(
							`
								UPDATE ${tablePrefix}execution_entity
								SET "workflowData" = :data
								WHERE id = '${execution.id}'
							`,
							{ data: JSON.stringify(data) },
							{},
						);

					queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const retryableExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM ${tablePrefix}execution_entity
			WHERE "waitTill" IS NULL AND finished = FALSE AND mode != 'retry'
			ORDER BY "startedAt" DESC
			LIMIT 200
		`);
		// @ts-ignore
		retryableExecutions.forEach(async (execution) => {
			const data = execution.workflowData;
			let credentialsUpdated = false;
			// @ts-ignore
			data.nodes.forEach((node) => {
				if (node.credentials) {
					const allNodeCredentials = Object.entries(node.credentials);
					for (const [type, creds] of allNodeCredentials) {
						if (typeof creds === 'object') {
							// @ts-ignore
							const matchingCredentials = credentialsEntities.find(
								// @ts-ignore
								(credentials) => credentials.id === creds.id && credentials.type === type,
							);
							if (matchingCredentials) {
								node.credentials[type] = matchingCredentials.name;
							} else {
								// @ts-ignore
								node.credentials[type] = creds.name;
							}
							credentialsUpdated = true;
						}
					}
				}
			});
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
					`
						UPDATE ${tablePrefix}execution_entity
						SET "workflowData" = :data
						WHERE id = '${execution.id}'
					`,
					{ data: JSON.stringify(data) },
					{},
				);

				queryRunner.query(updateQuery, updateParams);
			}
		});
	}
}
