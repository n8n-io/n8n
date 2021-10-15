import { MigrationInterface, QueryRunner } from 'typeorm';
import config = require('../../../../config');

// replacing the credentials in workflows and execution
// `nodeType: name` changes to `nodeType: { id, name }`

export class UpdateWorkflowCredentials1630330987096 implements MigrationInterface {
	name = 'UpdateWorkflowCredentials1630330987096';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		const credentialsEntities = await queryRunner.query(`
			SELECT id, name, type
			FROM "${tablePrefix}credentials_entity"
		`);

		const workflows = await queryRunner.query(`
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`);
		// @ts-ignore
		workflows.forEach(async (workflow) => {
			const nodes = JSON.parse(workflow.nodes);
			let credentialsUpdated = false;
			// @ts-ignore
			nodes.forEach((node) => {
				if (node.credentials) {
					const allNodeCredentials = Object.entries(node.credentials);
					for (const [type, name] of allNodeCredentials) {
						if (typeof name === 'string') {
							// @ts-ignore
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

		const waitingExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NOT NULL AND finished = 0
		`);

		const retryableExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NULL AND finished = 0 AND mode != 'retry'
			ORDER BY "startedAt" DESC
			LIMIT 200
		`);

		[...waitingExecutions, ...retryableExecutions].forEach(async (execution) => {
			const data = JSON.parse(execution.workflowData);
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

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		const credentialsEntities = await queryRunner.query(`
			SELECT id, name, type
			FROM "${tablePrefix}credentials_entity"
		`);

		const workflows = await queryRunner.query(`
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`);
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

		const waitingExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NOT NULL AND finished = 0
		`);

		const retryableExecutions = await queryRunner.query(`
			SELECT id, "workflowData"
			FROM "${tablePrefix}execution_entity"
			WHERE "waitTill" IS NULL AND finished = 0 AND mode != 'retry'
			ORDER BY "startedAt" DESC
			LIMIT 200
		`);

		[...waitingExecutions, ...retryableExecutions].forEach(async (execution) => {
			const data = JSON.parse(execution.workflowData);
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
