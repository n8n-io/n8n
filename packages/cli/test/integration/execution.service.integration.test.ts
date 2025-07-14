import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { ExecutionSummaries } from '@n8n/db';
import { ExecutionMetadataRepository, ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ExecutionService } from '@/executions/execution.service';

import { annotateExecution, createAnnotationTags, createExecution } from './shared/db/executions';

describe('ExecutionService', () => {
	let executionService: ExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		executionRepository = Container.get(ExecutionRepository);

		executionService = new ExecutionService(
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			executionRepository,
			Container.get(WorkflowRepository),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findRangeWithCount', () => {
		test('should return execution summaries', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			const summaryShape = {
				id: expect.any(String),
				workflowId: expect.any(String),
				mode: expect.any(String),
				retryOf: null,
				status: expect.any(String),
				createdAt: expect.any(String),
				startedAt: expect.any(String),
				stoppedAt: expect.any(String),
				waitTill: null,
				retrySuccessId: null,
				workflowName: expect.any(String),
				annotation: {
					tags: expect.arrayContaining([]),
					vote: null,
				},
			};

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([summaryShape, summaryShape]);
		});

		test('should limit executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 2 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(3);
			expect(output.estimated).toBe(false);
			expect(output.results).toHaveLength(2);
		});

		test('should retrieve executions before `lastId`, excluding it', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const [firstId, secondId] = await executionRepository.getAllIds();

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20, lastId: secondId },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(4);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([expect.objectContaining({ id: firstId })]),
			);
		});

		test('should retrieve executions after `firstId`, excluding it', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const [firstId, secondId, thirdId, fourthId] = await executionRepository.getAllIds();

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20, firstId },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(4);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: fourthId }),
					expect.objectContaining({ id: thirdId }),
					expect.objectContaining({ id: secondId }),
				]),
			);
		});

		test('should filter executions by `status`', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'waiting' }, workflow),
				createExecution({ status: 'waiting' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ status: 'success' }),
				expect.objectContaining({ status: 'success' }),
			]);
		});

		test('should filter executions by `workflowId`', async () => {
			const firstWorkflow = await createWorkflow();
			const secondWorkflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, firstWorkflow),
				createExecution({ status: 'success' }, secondWorkflow),
				createExecution({ status: 'success' }, secondWorkflow),
				createExecution({ status: 'success' }, secondWorkflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: firstWorkflow.id,
				accessibleWorkflowIds: [firstWorkflow.id, secondWorkflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([expect.objectContaining({ workflowId: firstWorkflow.id })]),
			);
		});

		test('should filter executions by `startedBefore`', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ startedAt: new Date('2020-06-01') }, workflow),
				createExecution({ startedAt: new Date('2020-12-31') }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				startedBefore: '2020-07-01',
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ startedAt: '2020-06-01T00:00:00.000Z' }),
			]);
		});

		test('should filter executions by `startedAfter`', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ startedAt: new Date('2020-06-01') }, workflow),
				createExecution({ startedAt: new Date('2020-12-31') }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				startedAfter: '2020-07-01',
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ startedAt: '2020-12-31T00:00:00.000Z' }),
			]);
		});

		test('should filter executions by `metadata` with an exact match by default', async () => {
			const workflow = await createWorkflow();

			const key = 'myKey';
			const value = 'myValue';

			await Promise.all([
				createExecution({ status: 'success', metadata: [{ key, value }] }, workflow),
				createExecution({ status: 'error', metadata: [{ key, value: `${value}2` }] }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
				metadata: [{ key, value, exactMatch: true }],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 1,
				estimated: false,
				results: [expect.objectContaining({ status: 'success' })],
			});
		});

		test('should filter executions by `metadata` with a partial match', async () => {
			const workflow = await createWorkflow();

			const key = 'myKey';

			await Promise.all([
				createExecution({ status: 'success', metadata: [{ key, value: 'myValue' }] }, workflow),
				createExecution({ status: 'error', metadata: [{ key, value: 'var' }] }, workflow),
				createExecution({ status: 'success', metadata: [{ key, value: 'evaluation' }] }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
				metadata: [{ key, value: 'val', exactMatch: false }],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 2,
				estimated: false,
				results: [
					expect.objectContaining({ status: 'success' }),
					expect.objectContaining({ status: 'success' }),
				],
			});
		});

		test('should filter executions by `projectId`', async () => {
			const firstProject = await createTeamProject();
			const secondProject = await createTeamProject();

			const firstWorkflow = await createWorkflow(undefined, firstProject);
			const secondWorkflow = await createWorkflow(undefined, secondProject);

			await createExecution({ status: 'success' }, firstWorkflow);
			await createExecution({ status: 'success' }, firstWorkflow);
			await createExecution({ status: 'success' }, secondWorkflow); // to filter out

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [firstWorkflow.id],
				projectId: firstProject.id,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 2,
				estimated: false,
				results: expect.arrayContaining([
					expect.objectContaining({ workflowId: firstWorkflow.id }),
					expect.objectContaining({ workflowId: firstWorkflow.id }),
					// execution for workflow in second project was filtered out
				]),
			});
		});

		test('should filter executions by `projectId` and expected `status`', async () => {
			const firstProject = await createTeamProject();
			const secondProject = await createTeamProject();

			const firstWorkflow = await createWorkflow(undefined, firstProject);
			const secondWorkflow = await createWorkflow(undefined, secondProject);

			await createExecution({ status: 'success' }, firstWorkflow);
			await createExecution({ status: 'error' }, firstWorkflow);
			await createExecution({ status: 'success' }, secondWorkflow);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [firstWorkflow.id],
				projectId: firstProject.id,
				status: ['error'],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 1,
				estimated: false,
				results: expect.arrayContaining([
					expect.objectContaining({ workflowId: firstWorkflow.id, status: 'error' }),
				]),
			});
		});

		test.each([
			{
				name: 'waitTill',
				filter: { waitTill: true },
				matchingParams: { waitTill: new Date() },
				nonMatchingParams: { waitTill: undefined },
			},
			{
				name: 'metadata',
				filter: { metadata: [{ key: 'testKey', value: 'testValue' }] },
				matchingParams: { metadata: [{ key: 'testKey', value: 'testValue' }] },
				nonMatchingParams: { metadata: [{ key: 'otherKey', value: 'otherValue' }] },
			},
			{
				name: 'startedAfter',
				filter: { startedAfter: '2023-01-01' },
				matchingParams: { startedAt: new Date('2023-06-01') },
				nonMatchingParams: { startedAt: new Date('2022-01-01') },
			},
			{
				name: 'startedBefore',
				filter: { startedBefore: '2023-12-31' },
				matchingParams: { startedAt: new Date('2023-06-01') },
				nonMatchingParams: { startedAt: new Date('2024-01-01') },
			},
		])(
			'should filter executions by `projectId` and expected `$name`',
			async ({ filter, matchingParams, nonMatchingParams }) => {
				const firstProject = await createTeamProject();
				const secondProject = await createTeamProject();

				const firstWorkflow = await createWorkflow(undefined, firstProject);
				const secondWorkflow = await createWorkflow(undefined, secondProject);

				await Promise.all([
					createExecution(matchingParams, firstWorkflow),
					createExecution(nonMatchingParams, secondWorkflow),
				]);

				const query: ExecutionSummaries.RangeQuery = {
					kind: 'range',
					range: { limit: 20 },
					accessibleWorkflowIds: [firstWorkflow.id],
					projectId: firstProject.id,
					...filter,
				};

				const output = await executionService.findRangeWithCount(query);

				expect(output).toEqual({
					count: 1,
					estimated: false,
					results: expect.arrayContaining([
						expect.objectContaining({ workflowId: firstWorkflow.id }),
					]),
				});
			},
		);

		test('should exclude executions by inaccessible `workflowId`', async () => {
			const accessibleWorkflow = await createWorkflow();
			const inaccessibleWorkflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'success' }, accessibleWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: inaccessibleWorkflow.id,
				accessibleWorkflowIds: [accessibleWorkflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(0);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([]);
		});

		test('should support advanced filters', async () => {
			const workflow = await createWorkflow();

			await Promise.all([createExecution({}, workflow), createExecution({}, workflow)]);

			const [firstId, secondId] = await executionRepository.getAllIds();

			const executionMetadataRepository = Container.get(ExecutionMetadataRepository);

			await executionMetadataRepository.save({
				key: 'key1',
				value: 'value1',
				execution: { id: firstId },
			});

			await executionMetadataRepository.save({
				key: 'key2',
				value: 'value2',
				execution: { id: secondId },
			});

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				metadata: [{ key: 'key1', value: 'value1' }],
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([expect.objectContaining({ id: firstId })]);
		});
	});

	describe('findLatestCurrentAndCompleted', () => {
		test('should return latest current and completed executions', async () => {
			const workflow = await createWorkflow();

			const totalCompleted = 21;

			await Promise.all([
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				...new Array(totalCompleted)
					.fill(null)
					.map(async () => await createExecution({ status: 'success' }, workflow)),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(23); // 3 current + 20 completed (excludes 21st)
			expect(output.count).toBe(totalCompleted); // 21 finished, excludes current
			expect(output.estimated).toBe(false);
		});

		test('should handle zero current executions', async () => {
			const workflow = await createWorkflow();

			const totalFinished = 5;

			await Promise.all(
				new Array(totalFinished)
					.fill(null)
					.map(async () => await createExecution({ status: 'success' }, workflow)),
			);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(totalFinished); // 5 finished
			expect(output.count).toBe(totalFinished); // 5 finished, excludes active
			expect(output.estimated).toBe(false);
		});

		test('should handle zero completed executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(3); // 3 finished
			expect(output.count).toBe(0); // 0 finished, excludes active
			expect(output.estimated).toBe(false);
		});

		test('should handle zero executions', async () => {
			const workflow = await createWorkflow();

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(0);
			expect(output.count).toBe(0);
			expect(output.estimated).toBe(false);
		});

		test('should prioritize `running` over `new` executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'new' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 2 },
				accessibleWorkflowIds: [workflow.id],
			};

			const { results } = await executionService.findLatestCurrentAndCompleted(query);

			expect(results).toHaveLength(2);
			expect(results[0].status).toBe('running');
			expect(results[1].status).toBe('running');
		});
	});

	describe('annotation', () => {
		const summaryShape = {
			id: expect.any(String),
			workflowId: expect.any(String),
			mode: expect.any(String),
			retryOf: null,
			status: expect.any(String),
			createdAt: expect.any(String),
			startedAt: expect.any(String),
			stoppedAt: expect.any(String),
			waitTill: null,
			retrySuccessId: null,
			workflowName: expect.any(String),
		};

		afterEach(async () => {
			await testDb.truncate(['AnnotationTagEntity', 'ExecutionAnnotation']);
		});

		test('should add and retrieve annotation', async () => {
			const workflow = await createWorkflow();

			const execution1 = await createExecution({ status: 'success' }, workflow);
			const execution2 = await createExecution({ status: 'success' }, workflow);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(
				execution1.id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await annotateExecution(execution2.id, { vote: 'down', tags: [annotationTags[2].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([
					{
						...summaryShape,
						annotation: {
							tags: [expect.objectContaining({ name: 'tag3' })],
							vote: 'down',
						},
					},
					{
						...summaryShape,
						annotation: {
							tags: expect.arrayContaining([
								expect.objectContaining({ name: 'tag1' }),
								expect.objectContaining({ name: 'tag2' }),
							]),
							vote: 'up',
						},
					},
				]),
			);
		});

		test('should update annotation', async () => {
			const workflow = await createWorkflow();

			const execution = await createExecution({ status: 'success' }, workflow);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(execution.id, { vote: 'up', tags: [annotationTags[0].id] }, [
				workflow.id,
			]);

			await annotateExecution(execution.id, { vote: 'down', tags: [annotationTags[1].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				{
					...summaryShape,
					annotation: {
						tags: [expect.objectContaining({ name: 'tag2' })],
						vote: 'down',
					},
				},
			]);
		});

		test('should filter by annotation tags', async () => {
			const workflow = await createWorkflow();

			const executions = await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(
				executions[0].id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await annotateExecution(executions[1].id, { vote: 'down', tags: [annotationTags[2].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
				annotationTags: [annotationTags[0].id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				{
					...summaryShape,
					annotation: {
						tags: expect.arrayContaining([
							expect.objectContaining({ name: 'tag1' }),
							expect.objectContaining({ name: 'tag2' }),
						]),
						vote: 'up',
					},
				},
			]);
		});

		test('should filter by annotation vote', async () => {
			const workflow = await createWorkflow();

			const executions = await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(
				executions[0].id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await annotateExecution(executions[1].id, { vote: 'down', tags: [annotationTags[2].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
				vote: 'up',
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				{
					...summaryShape,
					annotation: {
						tags: expect.arrayContaining([
							expect.objectContaining({ name: 'tag1' }),
							expect.objectContaining({ name: 'tag2' }),
						]),
						vote: 'up',
					},
				},
			]);
		});
	});
});
