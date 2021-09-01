import { MigrationInterface, QueryRunner } from 'typeorm';
import config = require('../../../../config');

export class UpdateWorkflowCredentials1630451444017 implements MigrationInterface {
	name = 'UpdateWorkflowCredentials1630451444017';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		const credentialsEntities = await queryRunner.query(`
			SELECT id, name, type
			FROM ${tablePrefix}credentials_entity
		`);

		const workflows = await queryRunner.query(`
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`);
		// @ts-ignore
		workflows.forEach(async (workflow) => {
			const nodes = workflow.nodes;
			let credentialsUpdated = false;
			// @ts-ignore
			nodes.forEach((node) => {
				if (node.credentials) {
					const [type, name] = Object.entries(node.credentials)[0];
					if (typeof name === 'string') {
						// @ts-ignore
						const matchingCredentials = credentialsEntities.find(credentials => credentials.name === name && credentials.type === type);
						node.credentials[type] = { id: matchingCredentials?.id || null, name };
						credentialsUpdated = true;
					}
				}
			});
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(`
				UPDATE ${tablePrefix}workflow_entity
				SET nodes = :nodes
				WHERE id = '${workflow.id}'
				`, { nodes: JSON.stringify(nodes) }, {});

				await queryRunner.query(updateQuery, updateParams);
			}
		});

		const retryableExecutions = await queryRunner.query(`
			SELECT id, workflowData
			FROM ${tablePrefix}execution_entity
			WHERE finished = 0 AND mode != 'retry'
			ORDER BY startedAt DESC
			LIMIT 200
		`);
		// @ts-ignore
		retryableExecutions.forEach(async (execution) => {
			const data = execution.workflowData;
			let credentialsUpdated = false;
			// @ts-ignore
			data.nodes.forEach((node) => {
				if (node.credentials) {
					const [type, name] = Object.entries(node.credentials)[0];
					if (typeof name === 'string') {
						// @ts-ignore
						const matchingCredentials = credentialsEntities.find(credentials => credentials.name === name && credentials.type === type);
						node.credentials[type] = { id: matchingCredentials?.id || null, name };
						credentialsUpdated = true;
					}
				}
			})
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(`
				UPDATE ${tablePrefix}execution_entity
				SET workflowData = :data
				WHERE id = '${execution.id}'
				`, { data: JSON.stringify(data) }, {});

				await queryRunner.query(updateQuery, updateParams);
			}
		});
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		const credentialsEntities = await queryRunner.query(`
			SELECT id, name, type
			FROM ${tablePrefix}credentials_entity
		`);

		const workflows = await queryRunner.query(`
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`);
		// @ts-ignore
		workflows.forEach(async (workflow) => {
			const nodes = workflow.nodes;
			let credentialsUpdated = false;
			// @ts-ignore
			nodes.forEach((node) => {
				if (node.credentials) {
					const [type, creds] = Object.entries(node.credentials)[0];
					if (typeof creds === 'object') {
						// @ts-ignore
						const matchingCredentials = credentialsEntities.find(credentials => credentials.id === creds.id && credentials.type === type);
						if (matchingCredentials) {
							node.credentials[type] = matchingCredentials.name;
						} else {
							// @ts-ignore
							node.credentials[type] = creds.name;
						}
						credentialsUpdated = true;
					}
				}
			});
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(`
				UPDATE ${tablePrefix}workflow_entity
				SET nodes = :nodes
				WHERE id = '${workflow.id}'
				`, { nodes: JSON.stringify(nodes) }, {});

				await queryRunner.query(updateQuery, updateParams);
			}
		});

		const retryableExecutions = await queryRunner.query(`
			SELECT id, workflowData
			FROM ${tablePrefix}execution_entity
			WHERE finished = 0 AND mode != 'retry'
			ORDER BY startedAt DESC
			LIMIT 200
		`);
		// @ts-ignore
		retryableExecutions.forEach(async (execution) => {
			const data = execution.workflowData;
			let credentialsUpdated = false;
			// @ts-ignore
			data.nodes.forEach((node) => {
				if (node.credentials) {
					const [type, creds] = Object.entries(node.credentials)[0];
					if (typeof creds === 'object') {
						// @ts-ignore
						const matchingCredentials = credentialsEntities.find(credentials => credentials.id === creds.id && credentials.type === type);
						if (matchingCredentials) {
							node.credentials[type] = matchingCredentials.name;
						} else {
							// @ts-ignore
							node.credentials[type] = creds.name;
						}
						credentialsUpdated = true;
					}
				}
			})
			if (credentialsUpdated) {
				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(`
				UPDATE ${tablePrefix}execution_entity
				SET workflowData = :data
				WHERE id = '${execution.id}'
				`, { data: JSON.stringify(data) }, {});

				await queryRunner.query(updateQuery, updateParams);
			}
		});
	}
}
