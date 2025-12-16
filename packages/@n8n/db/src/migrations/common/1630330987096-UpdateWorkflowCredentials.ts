/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { IWorkflowBase } from 'n8n-workflow';

import type { CredentialsEntity, WorkflowEntity } from '../../entities';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

type Credential = Pick<CredentialsEntity, 'id' | 'name' | 'type'>;
type ExecutionWithData = { id: string; workflowData: string | IWorkflowBase };
type Workflow = Pick<WorkflowEntity, 'id'> & { nodes: string | WorkflowEntity['nodes'] };

// replacing the credentials in workflows and execution
// `nodeType: name` changes to `nodeType: { id, name }`

export class UpdateWorkflowCredentials1630330987096 implements ReversibleMigration {
	async up({ dbType, escape, parseJson, runQuery, runInBatches }: MigrationContext) {
		const credentialsTable = escape.tableName('credentials_entity');
		const workflowsTable = escape.tableName('workflow_entity');
		const executionsTable = escape.tableName('execution_entity');
		const dataColumn = escape.columnName('workflowData');
		const waitTillColumn = escape.columnName('waitTill');

		const credentialsEntities: Credential[] = await runQuery(
			`SELECT id, name, type FROM ${credentialsTable}`,
		);

		const workflowsQuery = `SELECT id, nodes FROM ${workflowsTable}`;
		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			workflows.forEach(async (workflow) => {
				let credentialsUpdated = false;
				const nodes = parseJson(workflow.nodes);
				nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, name] of allNodeCredentials) {
							if (typeof name === 'string') {
								const matchingCredentials = credentialsEntities.find(
									(credentials) => credentials.name === name && credentials.type === type,
								);
								node.credentials[type] = { id: matchingCredentials?.id ?? null, name };
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					await runQuery(`UPDATE ${workflowsTable} SET nodes = :nodes WHERE id = :id`, {
						nodes: JSON.stringify(nodes),
						id: workflow.id,
					});
				}
			});
		});

		const finishedValue = dbType === 'postgresdb' ? 'FALSE' : '0';
		const waitingExecutionsQuery = `
			SELECT id, ${dataColumn}
			FROM ${executionsTable}
			WHERE ${waitTillColumn} IS NOT NULL AND finished = ${finishedValue}
		`;
		await runInBatches<ExecutionWithData>(waitingExecutionsQuery, async (waitingExecutions) => {
			waitingExecutions.forEach(async (execution) => {
				let credentialsUpdated = false;
				const workflowData = parseJson(execution.workflowData);
				workflowData.nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, name] of allNodeCredentials) {
							if (typeof name === 'string') {
								const matchingCredentials = credentialsEntities.find(
									(credentials) => credentials.name === name && credentials.type === type,
								);
								node.credentials[type] = { id: matchingCredentials?.id ?? null, name };
								credentialsUpdated = true;
							}
						}
					}
				});
				if (credentialsUpdated) {
					await runQuery(
						`UPDATE ${executionsTable}
						 SET ${escape.columnName('workflowData')} = :data WHERE id = :id`,
						{ data: JSON.stringify(workflowData), id: execution.id },
					);
				}
			});
		});

		const retryableExecutions: ExecutionWithData[] = await runQuery(`
			SELECT id, ${dataColumn}
			FROM ${executionsTable}
			WHERE ${waitTillColumn} IS NULL AND finished = ${finishedValue} AND mode != 'retry'
			ORDER BY ${escape.columnName('startedAt')} DESC
			LIMIT 200
		`);
		retryableExecutions.forEach(async (execution) => {
			let credentialsUpdated = false;
			const workflowData = parseJson(execution.workflowData);
			workflowData.nodes.forEach((node) => {
				if (node.credentials) {
					const allNodeCredentials = Object.entries(node.credentials);
					for (const [type, name] of allNodeCredentials) {
						if (typeof name === 'string') {
							const matchingCredentials = credentialsEntities.find(
								(credentials) => credentials.name === name && credentials.type === type,
							);
							node.credentials[type] = { id: matchingCredentials?.id ?? null, name };
							credentialsUpdated = true;
						}
					}
				}
			});
			if (credentialsUpdated) {
				await runQuery(
					`UPDATE ${executionsTable}
					 SET ${escape.columnName('workflowData')} = :data WHERE id = :id`,
					{ data: JSON.stringify(workflowData), id: execution.id },
				);
			}
		});
	}

	async down({ dbType, escape, parseJson, runQuery, runInBatches }: MigrationContext) {
		const credentialsTable = escape.tableName('credentials_entity');
		const workflowsTable = escape.tableName('workflow_entity');
		const executionsTable = escape.tableName('execution_entity');
		const dataColumn = escape.columnName('workflowData');
		const waitTillColumn = escape.columnName('waitTill');

		const credentialsEntities: Credential[] = await runQuery(
			`SELECT id, name, type FROM ${credentialsTable}`,
		);

		const workflowsQuery = `SELECT id, nodes FROM ${workflowsTable}`;
		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			workflows.forEach(async (workflow) => {
				let credentialsUpdated = false;
				const nodes = parseJson(workflow.nodes);
				nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, creds] of allNodeCredentials) {
							if (typeof creds === 'object') {
								const matchingCredentials = credentialsEntities.find(
									// double-equals because creds.id can be string or number
									// eslint-disable-next-line eqeqeq
									(credentials) => credentials.id == creds.id && credentials.type === type,
								);
								if (matchingCredentials) {
									// @ts-ignore
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
					await runQuery(`UPDATE ${workflowsTable} SET nodes = :nodes WHERE id = :id`, {
						nodes: JSON.stringify(nodes),
						id: workflow.id,
					});
				}
			});
		});

		const finishedValue = dbType === 'postgresdb' ? 'FALSE' : '0';
		const waitingExecutionsQuery = `
			SELECT id, ${dataColumn}
			FROM ${executionsTable}
			WHERE ${waitTillColumn} IS NOT NULL AND finished = ${finishedValue}
		`;

		await runInBatches<ExecutionWithData>(waitingExecutionsQuery, async (waitingExecutions) => {
			waitingExecutions.forEach(async (execution) => {
				let credentialsUpdated = false;
				const workflowData = parseJson(execution.workflowData);
				workflowData.nodes.forEach((node) => {
					if (node.credentials) {
						const allNodeCredentials = Object.entries(node.credentials);
						for (const [type, creds] of allNodeCredentials) {
							if (typeof creds === 'object') {
								const matchingCredentials = credentialsEntities.find(
									// double-equals because creds.id can be string or number
									// eslint-disable-next-line eqeqeq
									(credentials) => credentials.id == creds.id && credentials.type === type,
								);
								if (matchingCredentials) {
									// @ts-ignore
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
					await runQuery(
						`UPDATE ${executionsTable}
						 SET ${escape.columnName('workflowData')} = :data WHERE id = :id`,
						{ data: JSON.stringify(workflowData), id: execution.id },
					);
				}
			});
		});

		const retryableExecutions: ExecutionWithData[] = await runQuery(`
			SELECT id, ${dataColumn}
			FROM ${executionsTable}
			WHERE ${waitTillColumn} IS NULL AND finished = ${finishedValue} AND mode != 'retry'
			ORDER BY ${escape.columnName('startedAt')} DESC
			LIMIT 200
		`);
		retryableExecutions.forEach(async (execution) => {
			let credentialsUpdated = false;
			const workflowData = parseJson(execution.workflowData);
			workflowData.nodes.forEach((node) => {
				if (node.credentials) {
					const allNodeCredentials = Object.entries(node.credentials);
					for (const [type, creds] of allNodeCredentials) {
						if (typeof creds === 'object') {
							const matchingCredentials = credentialsEntities.find(
								// double-equals because creds.id can be string or number
								// eslint-disable-next-line eqeqeq
								(credentials) => credentials.id == creds.id && credentials.type === type,
							);
							if (matchingCredentials) {
								// @ts-ignore
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
				await runQuery(
					`UPDATE ${executionsTable}
					 SET ${escape.columnName('workflowData')} = :data WHERE id = :id`,
					{ data: JSON.stringify(workflowData), id: execution.id },
				);
			}
		});
	}
}
