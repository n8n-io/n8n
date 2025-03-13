import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { User } from '@/databases/entities/user';
import { TestDefinitionRepository } from '@/databases/repositories/test-definition.repository.ee';
import { TestMetricRepository } from '@/databases/repositories/test-metric.repository.ee';
import { createUserShell } from '@test-integration/db/users';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let authOwnerAgent: SuperAgentTest;
let workflowUnderTest: IWorkflowBase;
let otherWorkflow: IWorkflowBase;
let testDefinition: TestDefinition;
let otherTestDefinition: TestDefinition;
let ownerShell: User;

const testServer = utils.setupTestServer({ endpointGroups: ['evaluation'] });

beforeAll(async () => {
	ownerShell = await createUserShell('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['TestDefinition', 'TestMetric']);

	workflowUnderTest = await createWorkflow({ name: 'workflow-under-test' }, ownerShell);

	testDefinition = Container.get(TestDefinitionRepository).create({
		name: 'test',
		workflow: { id: workflowUnderTest.id },
	});
	await Container.get(TestDefinitionRepository).save(testDefinition);

	otherWorkflow = await createWorkflow({ name: 'other-workflow' });

	otherTestDefinition = Container.get(TestDefinitionRepository).create({
		name: 'other-test',
		workflow: { id: otherWorkflow.id },
	});
	await Container.get(TestDefinitionRepository).save(otherTestDefinition);
});

describe('GET /evaluation/test-definitions/:testDefinitionId/metrics', () => {
	test('should retrieve empty list of metrics for a test definition', async () => {
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/metrics`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.length).toBe(0);
	});

	test('should retrieve metrics for a test definition', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const newMetric2 = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-2',
		});
		await Container.get(TestMetricRepository).save(newMetric2);

		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/metrics`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.length).toBe(2);
		expect(resp.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: expect.any(String),
					name: 'metric-1',
				}),
				expect.objectContaining({
					id: expect.any(String),
					name: 'metric-2',
				}),
			]),
		);
	});

	test('should return 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.get('/evaluation/test-definitions/999/metrics');

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if test definition is not accessible to the user', async () => {
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${otherTestDefinition.id}/metrics`,
		);

		expect(resp.statusCode).toBe(404);
	});
});

describe('GET /evaluation/test-definitions/:testDefinitionId/metrics/:id', () => {
	test('should retrieve a metric for a test definition', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/metrics/${newMetric.id}`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: newMetric.id,
				name: 'metric-1',
			}),
		);
	});

	test('should return 404 if metric does not exist', async () => {
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/metrics/999`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if metric is not accessible to the user', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: otherTestDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${otherTestDefinition.id}/metrics/${newMetric.id}`,
		);

		expect(resp.statusCode).toBe(404);
	});
});

describe('POST /evaluation/test-definitions/:testDefinitionId/metrics', () => {
	test('should create a metric for a test definition', async () => {
		const resp = await authOwnerAgent
			.post(`/evaluation/test-definitions/${testDefinition.id}/metrics`)
			.send({
				name: 'metric-1',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: 'metric-1',
			}),
		);

		const metrics = await Container.get(TestMetricRepository).find({
			where: { testDefinition: { id: testDefinition.id } },
		});
		expect(metrics.length).toBe(1);
		expect(metrics[0].name).toBe('metric-1');
	});

	test('should return 400 if name is missing', async () => {
		const resp = await authOwnerAgent
			.post(`/evaluation/test-definitions/${testDefinition.id}/metrics`)
			.send({});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'invalid_type',
					message: 'Required',
					path: ['name'],
				}),
			]),
		);
	});

	test('should return 400 if name is not a string', async () => {
		const resp = await authOwnerAgent
			.post(`/evaluation/test-definitions/${testDefinition.id}/metrics`)
			.send({
				name: 123,
			});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'invalid_type',
					message: 'Expected string, received number',
					path: ['name'],
				}),
			]),
		);
	});

	test('should return 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions/999/metrics').send({
			name: 'metric-1',
		});

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if test definition is not accessible to the user', async () => {
		const resp = await authOwnerAgent
			.post(`/evaluation/test-definitions/${otherTestDefinition.id}/metrics`)
			.send({
				name: 'metric-1',
			});

		expect(resp.statusCode).toBe(404);
	});
});

describe('PATCH /evaluation/test-definitions/:testDefinitionId/metrics/:id', () => {
	test('should update a metric for a test definition', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent
			.patch(`/evaluation/test-definitions/${testDefinition.id}/metrics/${newMetric.id}`)
			.send({
				name: 'metric-2',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: newMetric.id,
				name: 'metric-2',
			}),
		);

		const metrics = await Container.get(TestMetricRepository).find({
			where: { testDefinition: { id: testDefinition.id } },
		});
		expect(metrics.length).toBe(1);
		expect(metrics[0].name).toBe('metric-2');
	});

	test('should return 400 if name is missing', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent
			.patch(`/evaluation/test-definitions/${testDefinition.id}/metrics/${newMetric.id}`)
			.send({});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'invalid_type',
					message: 'Required',
					path: ['name'],
				}),
			]),
		);
	});

	test('should return 400 if name is not a string', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent
			.patch(`/evaluation/test-definitions/${testDefinition.id}/metrics/${newMetric.id}`)
			.send({
				name: 123,
			});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'invalid_type',
					message: 'Expected string, received number',
				}),
			]),
		);
	});

	test('should return 404 if metric does not exist', async () => {
		const resp = await authOwnerAgent
			.patch(`/evaluation/test-definitions/${testDefinition.id}/metrics/999`)
			.send({
				name: 'metric-1',
			});

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.patch('/evaluation/test-definitions/999/metrics/999').send({
			name: 'metric-1',
		});

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if metric is not accessible to the user', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: otherTestDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent
			.patch(`/evaluation/test-definitions/${otherTestDefinition.id}/metrics/${newMetric.id}`)
			.send({
				name: 'metric-2',
			});

		expect(resp.statusCode).toBe(404);
	});
});

describe('DELETE /evaluation/test-definitions/:testDefinitionId/metrics/:id', () => {
	test('should delete a metric for a test definition', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: testDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent.delete(
			`/evaluation/test-definitions/${testDefinition.id}/metrics/${newMetric.id}`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual({ success: true });

		const metrics = await Container.get(TestMetricRepository).find({
			where: { testDefinition: { id: testDefinition.id } },
		});
		expect(metrics.length).toBe(0);
	});

	test('should return 404 if metric does not exist', async () => {
		const resp = await authOwnerAgent.delete(
			`/evaluation/test-definitions/${testDefinition.id}/metrics/999`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if metric is not accessible to the user', async () => {
		const newMetric = Container.get(TestMetricRepository).create({
			testDefinition: { id: otherTestDefinition.id },
			name: 'metric-1',
		});
		await Container.get(TestMetricRepository).save(newMetric);

		const resp = await authOwnerAgent.delete(
			`/evaluation/test-definitions/${otherTestDefinition.id}/metrics/${newMetric.id}`,
		);

		expect(resp.statusCode).toBe(404);
	});
});
