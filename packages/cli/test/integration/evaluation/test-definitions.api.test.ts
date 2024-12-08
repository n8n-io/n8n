import { mockInstance } from 'n8n-core/test/utils';
import { Container } from 'typedi';

import type { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { TestDefinitionRepository } from '@/databases/repositories/test-definition.repository.ee';
import { TestRunnerService } from '@/evaluation/test-runner/test-runner.service.ee';
import { createAnnotationTags } from '@test-integration/db/executions';

import { createUserShell } from './../shared/db/users';
import { createWorkflow } from './../shared/db/workflows';
import * as testDb from './../shared/test-db';
import type { SuperAgentTest } from './../shared/types';
import * as utils from './../shared/utils/';

const testRunner = mockInstance(TestRunnerService);

let authOwnerAgent: SuperAgentTest;
let workflowUnderTest: WorkflowEntity;
let workflowUnderTest2: WorkflowEntity;
let evaluationWorkflow: WorkflowEntity;
let otherWorkflow: WorkflowEntity;
let ownerShell: User;
let annotationTag: AnnotationTagEntity;
const testServer = utils.setupTestServer({ endpointGroups: ['evaluation'] });

beforeAll(async () => {
	ownerShell = await createUserShell('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['TestDefinition', 'Workflow', 'AnnotationTag']);

	workflowUnderTest = await createWorkflow({ name: 'workflow-under-test' }, ownerShell);
	workflowUnderTest2 = await createWorkflow({ name: 'workflow-under-test-2' }, ownerShell);
	evaluationWorkflow = await createWorkflow({ name: 'evaluation-workflow' }, ownerShell);
	otherWorkflow = await createWorkflow({ name: 'other-workflow' });
	annotationTag = (await createAnnotationTags(['test-tag']))[0];
});

describe('GET /evaluation/test-definitions', () => {
	test('should retrieve empty test definitions list', async () => {
		const resp = await authOwnerAgent.get('/evaluation/test-definitions');
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.count).toBe(0);
		expect(resp.body.data.testDefinitions).toHaveLength(0);
	});

	test('should retrieve test definitions list', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.get('/evaluation/test-definitions');

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual({
			count: 1,
			testDefinitions: [
				expect.objectContaining({
					name: 'test',
					workflowId: workflowUnderTest.id,
					evaluationWorkflowId: null,
				}),
			],
		});
	});

	test('should retrieve test definitions list with pagination', async () => {
		// Add a bunch of test definitions
		const testDefinitions = [];

		for (let i = 0; i < 15; i++) {
			const newTest = Container.get(TestDefinitionRepository).create({
				name: `test-${i}`,
				workflow: { id: workflowUnderTest.id },
			});
			testDefinitions.push(newTest);
		}

		await Container.get(TestDefinitionRepository).save(testDefinitions);

		// Fetch the first page
		let resp = await authOwnerAgent.get('/evaluation/test-definitions?take=10');
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.count).toBe(15);
		expect(resp.body.data.testDefinitions).toHaveLength(10);

		// Fetch the second page
		resp = await authOwnerAgent.get('/evaluation/test-definitions?take=10&skip=10');
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.count).toBe(15);
		expect(resp.body.data.testDefinitions).toHaveLength(5);
	});

	test('should retrieve test definitions list for a workflow', async () => {
		// Add a bunch of test definitions for two different workflows
		const testDefinitions = [];

		for (let i = 0; i < 15; i++) {
			const newTest = Container.get(TestDefinitionRepository).create({
				name: `test-${i}`,
				workflow: { id: workflowUnderTest.id },
			});

			const newTest2 = Container.get(TestDefinitionRepository).create({
				name: `test-${i * 2}`,
				workflow: { id: workflowUnderTest2.id },
			});

			testDefinitions.push(newTest, newTest2);
		}

		await Container.get(TestDefinitionRepository).save(testDefinitions);

		// Fetch test definitions of a second workflow
		let resp = await authOwnerAgent.get(
			`/evaluation/test-definitions?filter=${JSON.stringify({ workflowId: workflowUnderTest2.id })}`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.count).toBe(15);
	});

	test('should return error if user has no access to the workflowId specified in filter', async () => {
		let resp = await authOwnerAgent.get(
			`/evaluation/test-definitions?filter=${JSON.stringify({ workflowId: otherWorkflow.id })}`,
		);

		expect(resp.statusCode).toBe(403);
		expect(resp.body.message).toBe('User does not have access to the workflow');
	});
});

describe('GET /evaluation/test-definitions/:id', () => {
	test('should retrieve test definition', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.get(`/evaluation/test-definitions/${newTest.id}`);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.name).toBe('test');
		expect(resp.body.data.workflowId).toBe(workflowUnderTest.id);
		expect(resp.body.data.evaluationWorkflowId).toBe(null);
	});

	test('should return 404 for non-existent test definition', async () => {
		const resp = await authOwnerAgent.get('/evaluation/test-definitions/123');

		expect(resp.statusCode).toBe(404);
	});

	test('should retrieve test definition with evaluation workflow', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
			evaluationWorkflow: { id: evaluationWorkflow.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.get(`/evaluation/test-definitions/${newTest.id}`);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.name).toBe('test');
		expect(resp.body.data.workflowId).toBe(workflowUnderTest.id);
		expect(resp.body.data.evaluationWorkflowId).toBe(evaluationWorkflow.id);
	});

	test('should not retrieve test definition if user does not have access to workflow under test', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: otherWorkflow.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.get(`/evaluation/test-definitions/${newTest.id}`);

		expect(resp.statusCode).toBe(404);
	});
});

describe('POST /evaluation/test-definitions', () => {
	test('should create test definition', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions').send({
			name: 'test',
			workflowId: workflowUnderTest.id,
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.name).toBe('test');
		expect(resp.body.data.workflowId).toBe(workflowUnderTest.id);
	});

	test('should create test definition with evaluation workflow', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions').send({
			name: 'test',
			workflowId: workflowUnderTest.id,
			evaluationWorkflowId: evaluationWorkflow.id,
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				name: 'test',
				workflowId: workflowUnderTest.id,
				evaluationWorkflowId: evaluationWorkflow.id,
			}),
		);
	});

	test('should create test definition with all fields', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions').send({
			name: 'test',
			description: 'test description',
			workflowId: workflowUnderTest.id,
			evaluationWorkflowId: evaluationWorkflow.id,
			annotationTagId: annotationTag.id,
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				name: 'test',
				description: 'test description',
				workflowId: workflowUnderTest.id,
				evaluationWorkflowId: evaluationWorkflow.id,
				annotationTag: expect.objectContaining({
					id: annotationTag.id,
				}),
			}),
		);
	});

	test('should return error if name is empty', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions').send({
			name: '',
			workflowId: workflowUnderTest.id,
		});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'too_small',
					path: ['name'],
				}),
			]),
		);
	});

	test('should return error if user has no access to the workflow', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions').send({
			name: 'test',
			workflowId: otherWorkflow.id,
		});

		expect(resp.statusCode).toBe(403);
		expect(resp.body.message).toBe('User does not have access to the workflow');
	});

	test('should return error if user has no access to the evaluation workflow', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions').send({
			name: 'test',
			workflowId: workflowUnderTest.id,
			evaluationWorkflowId: otherWorkflow.id,
		});

		expect(resp.statusCode).toBe(403);
		expect(resp.body.message).toBe('User does not have access to the evaluation workflow');
	});
});

describe('PATCH /evaluation/test-definitions/:id', () => {
	test('should update test definition', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			name: 'updated-test',
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.name).toBe('updated-test');
	});

	test('should return 404 if user has no access to the workflow', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: otherWorkflow.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			name: 'updated-test',
		});

		expect(resp.statusCode).toBe(404);
		expect(resp.body.message).toBe('Test definition not found');
	});

	test('should update test definition with evaluation workflow', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			name: 'updated-test',
			evaluationWorkflowId: evaluationWorkflow.id,
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.name).toBe('updated-test');
		expect(resp.body.data.evaluationWorkflowId).toBe(evaluationWorkflow.id);
	});

	test('should return error if user has no access to the evaluation workflow', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			name: 'updated-test',
			evaluationWorkflowId: otherWorkflow.id,
		});

		expect(resp.statusCode).toBe(403);
		expect(resp.body.message).toBe('User does not have access to the evaluation workflow');
	});

	test('should disallow workflowId', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			name: 'updated-test',
			workflowId: otherWorkflow.id,
		});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'unrecognized_keys',
					keys: ['workflowId'],
				}),
			]),
		);
	});

	test('should update annotationTagId', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			annotationTagId: annotationTag.id,
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.annotationTag.id).toBe(annotationTag.id);
	});

	test('should return error if annotationTagId is invalid', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			annotationTagId: '123',
		});

		expect(resp.statusCode).toBe(400);
		expect(resp.body.message).toBe('Annotation tag not found');
	});

	test('should update pinned nodes', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			mockedNodes: [
				{
					name: 'Schedule Trigger',
				},
			],
		});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.mockedNodes).toEqual([{ name: 'Schedule Trigger' }]);
	});

	test('should return error if pinned nodes are invalid', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			mockedNodes: ['Simple string'],
		});

		expect(resp.statusCode).toBe(400);
	});

	test('should return error if pinned nodes are not in the workflow', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.patch(`/evaluation/test-definitions/${newTest.id}`).send({
			mockedNodes: [
				{
					name: 'Invalid Node',
				},
			],
		});

		expect(resp.statusCode).toBe(400);
	});
});

describe('DELETE /evaluation/test-definitions/:id', () => {
	test('should delete test definition', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.delete(`/evaluation/test-definitions/${newTest.id}`);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data.success).toBe(true);
	});

	test('should return 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.delete('/evaluation/test-definitions/123');

		expect(resp.statusCode).toBe(404);
		expect(resp.body.message).toBe('Test definition not found');
	});

	test('should return 404 if user has no access to the workflow', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: otherWorkflow.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.delete(`/evaluation/test-definitions/${newTest.id}`);

		expect(resp.statusCode).toBe(404);
		expect(resp.body.message).toBe('Test definition not found');
	});
});

describe('POST /evaluation/test-definitions/:id/run', () => {
	test('should trigger the test run', async () => {
		const newTest = Container.get(TestDefinitionRepository).create({
			name: 'test',
			workflow: { id: workflowUnderTest.id },
		});
		await Container.get(TestDefinitionRepository).save(newTest);

		const resp = await authOwnerAgent.post(`/evaluation/test-definitions/${newTest.id}/run`);

		expect(resp.statusCode).toBe(202);
		expect(resp.body).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);

		expect(testRunner.runTest).toHaveBeenCalledTimes(1);
	});
});
