/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { MigrationContext, ReversibleMigration } from '@db/types';
import { runInBatches } from '@db/utils/migrationHelpers';

// replacing the credentials in workflows and execution
// `nodeType: name` changes to `nodeType: { id, name }`

export class UpdateWorkflowCredentials1630330987096 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const credentialsEntities = (await queryRunner.query(`
			SELECT id, name, type
			FROM "${tablePrefix}credentials_entity"
		`)) as Array<{ id: string; name: string; type: string }>;

		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		// @ts-ignore
		await runInBatches(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = JSON.parse(workflow.nodes);
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
								node.credentials[type] = { id: matchingCredentials?.id || null, name };
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					const [updateQuery, updateParams] =
						queryRunner.connection.driver.escapeQueryWithParameters(
							`
								UPDATE "${tablePrefix}workflow_entity"
								SET nodes = :nodes
								WHERE id = '${workflow.id}'
							`,
							{ nodes: JSON.stringify(nodes) },
							{},
						);

					await queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const waitingExecutionsQuery = `
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NOT NULL AND finished = 0
		`;
		// @ts-ignore
		await runInBatches(queryRunner, waitingExecutionsQuery, (waitingExecutions) => {
			waitingExecutions.forEach(async (execution) => {
				const data = JSON.parse(execution.workflowData);
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
								node.credentials[type] = { id: matchingCredentials?.id || null, name };
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					const [updateQuery, updateParams] =
						queryRunner.connection.driver.escapeQueryWithParameters(
							`
								UPDATE "${tablePrefix}execution_entity"
								SET "workflowData" = :data
								WHERE id = '${execution.id}'
							`,
							{ data: JSON.stringify(data) },
							{},
						);

					await queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const retryableExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NULL AND finished = 0 AND mode != 'retry'
			ORDER BY "startedAt" DESC
			LIMIT 200
		`);
		// @ts-ignore
		retryableExecutions.forEach(async (execution) => {
			const data = JSON.parse(execution.workflowData);
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
							node.credentials[type] = { id: matchingCredentials?.id || null, name };
							credentialsUpdated = true;
						}
					}
				}
			});
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
					`
						UPDATE "${tablePrefix}execution_entity"
						SET "workflowData" = :data
						WHERE id = '${execution.id}'
					`,
					{ data: JSON.stringify(data) },
					{},
				);

				await queryRunner.query(updateQuery, updateParams);
			}
		});
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		const credentialsEntities = (await queryRunner.query(`
			SELECT id, name, type
			FROM "${tablePrefix}credentials_entity"
		`)) as Array<{ id: string; name: string; type: string }>;

		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		// @ts-ignore
		await runInBatches(queryRunner, workflowsQuery, (workflows) => {
			// @ts-ignore
			workflows.forEach(async (workflow) => {
				const nodes = JSON.parse(workflow.nodes);
				let credentialsUpdated = false;
				// @ts-ignore
				nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, creds] of allNodeCredentials) {
							if (typeof creds === 'object') {
								const matchingCredentials = credentialsEntities.find(
									// @ts-ignore
									// double-equals because creds.id can be string or number
									// eslint-disable-next-line eqeqeq
									(credentials) => credentials.id == creds.id && credentials.type === type,
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
								UPDATE "${tablePrefix}workflow_entity"
								SET nodes = :nodes
								WHERE id = '${workflow.id}'
							`,
							{ nodes: JSON.stringify(nodes) },
							{},
						);

					await queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const waitingExecutionsQuery = `
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NOT NULL AND finished = 0
		`;

		// @ts-ignore
		await runInBatches(queryRunner, waitingExecutionsQuery, (waitingExecutions) => {
			// @ts-ignore
			waitingExecutions.forEach(async (execution) => {
				const data = JSON.parse(execution.workflowData);
				let credentialsUpdated = false;
				// @ts-ignore
				data.nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, creds] of allNodeCredentials) {
							if (typeof creds === 'object') {
								const matchingCredentials = credentialsEntities.find(
									// @ts-ignore
									// double-equals because creds.id can be string or number
									// eslint-disable-next-line eqeqeq
									(credentials) => credentials.id == creds.id && credentials.type === type,
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
								UPDATE "${tablePrefix}execution_entity"
								SET "workflowData" = :data
								WHERE id = '${execution.id}'
							`,
							{ data: JSON.stringify(data) },
							{},
						);

					await queryRunner.query(updateQuery, updateParams);
				}
			});
		});

		const retryableExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NULL AND finished = 0 AND mode != 'retry'
			ORDER BY "startedAt" DESC
			LIMIT 200
		`);

		// @ts-ignore
		retryableExecutions.forEach(async (execution) => {
			const data = JSON.parse(execution.workflowData);
			let credentialsUpdated = false;
			// @ts-ignore
			data.nodes.forEach((node) => {
				if (node.credentials) {
					const allNodeCredentials = Object.entries(node.credentials);
					for (const [type, creds] of allNodeCredentials) {
						if (typeof creds === 'object') {
							const matchingCredentials = credentialsEntities.find(
								// @ts-ignore
								// double-equals because creds.id can be string or number
								// eslint-disable-next-line eqeqeq
								(credentials) => credentials.id == creds.id && credentials.type === type,
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
						UPDATE "${tablePrefix}execution_entity"
						SET "workflowData" = :data
						WHERE id = '${execution.id}'
					`,
					{ data: JSON.stringify(data) },
					{},
				);

				await queryRunner.query(updateQuery, updateParams);
			}
		});
	}
}
