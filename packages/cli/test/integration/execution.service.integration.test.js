'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const execution_service_1 = require('@/executions/execution.service');
const executions_1 = require('./shared/db/executions');
describe('ExecutionService', () => {
	let executionService;
	let executionRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		executionRepository = di_1.Container.get(db_1.ExecutionRepository);
		executionService = new execution_service_1.ExecutionService(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			executionRepository,
			di_1.Container.get(db_1.WorkflowRepository),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate(['ExecutionEntity']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('findRangeWithCount', () => {
		test('should return execution summaries', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
			]);
			const [firstId, secondId] = await executionRepository.getAllIds();
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
			]);
			const [firstId, secondId, thirdId, fourthId] = await executionRepository.getAllIds();
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'waiting' }, workflow),
				(0, executions_1.createExecution)({ status: 'waiting' }, workflow),
			]);
			const query = {
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
			const firstWorkflow = await (0, backend_test_utils_1.createWorkflow)();
			const secondWorkflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, firstWorkflow),
				(0, executions_1.createExecution)({ status: 'success' }, secondWorkflow),
				(0, executions_1.createExecution)({ status: 'success' }, secondWorkflow),
				(0, executions_1.createExecution)({ status: 'success' }, secondWorkflow),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ startedAt: new Date('2020-06-01') }, workflow),
				(0, executions_1.createExecution)({ startedAt: new Date('2020-12-31') }, workflow),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ startedAt: new Date('2020-06-01') }, workflow),
				(0, executions_1.createExecution)({ startedAt: new Date('2020-12-31') }, workflow),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const key = 'myKey';
			const value = 'myValue';
			await Promise.all([
				(0, executions_1.createExecution)(
					{ status: 'success', metadata: [{ key, value }] },
					workflow,
				),
				(0, executions_1.createExecution)(
					{ status: 'error', metadata: [{ key, value: `${value}2` }] },
					workflow,
				),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const key = 'myKey';
			await Promise.all([
				(0, executions_1.createExecution)(
					{ status: 'success', metadata: [{ key, value: 'myValue' }] },
					workflow,
				),
				(0, executions_1.createExecution)(
					{ status: 'error', metadata: [{ key, value: 'var' }] },
					workflow,
				),
				(0, executions_1.createExecution)(
					{ status: 'success', metadata: [{ key, value: 'evaluation' }] },
					workflow,
				),
			]);
			const query = {
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
			const firstProject = await (0, backend_test_utils_1.createTeamProject)();
			const secondProject = await (0, backend_test_utils_1.createTeamProject)();
			const firstWorkflow = await (0, backend_test_utils_1.createWorkflow)(undefined, firstProject);
			const secondWorkflow = await (0, backend_test_utils_1.createWorkflow)(
				undefined,
				secondProject,
			);
			await (0, executions_1.createExecution)({ status: 'success' }, firstWorkflow);
			await (0, executions_1.createExecution)({ status: 'success' }, firstWorkflow);
			await (0, executions_1.createExecution)({ status: 'success' }, secondWorkflow);
			const query = {
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
				]),
			});
		});
		test('should filter executions by `projectId` and expected `status`', async () => {
			const firstProject = await (0, backend_test_utils_1.createTeamProject)();
			const secondProject = await (0, backend_test_utils_1.createTeamProject)();
			const firstWorkflow = await (0, backend_test_utils_1.createWorkflow)(undefined, firstProject);
			const secondWorkflow = await (0, backend_test_utils_1.createWorkflow)(
				undefined,
				secondProject,
			);
			await (0, executions_1.createExecution)({ status: 'success' }, firstWorkflow);
			await (0, executions_1.createExecution)({ status: 'error' }, firstWorkflow);
			await (0, executions_1.createExecution)({ status: 'success' }, secondWorkflow);
			const query = {
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
				const firstProject = await (0, backend_test_utils_1.createTeamProject)();
				const secondProject = await (0, backend_test_utils_1.createTeamProject)();
				const firstWorkflow = await (0, backend_test_utils_1.createWorkflow)(
					undefined,
					firstProject,
				);
				const secondWorkflow = await (0, backend_test_utils_1.createWorkflow)(
					undefined,
					secondProject,
				);
				await Promise.all([
					(0, executions_1.createExecution)(matchingParams, firstWorkflow),
					(0, executions_1.createExecution)(nonMatchingParams, secondWorkflow),
				]);
				const query = {
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
			const accessibleWorkflow = await (0, backend_test_utils_1.createWorkflow)();
			const inaccessibleWorkflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, accessibleWorkflow),
				(0, executions_1.createExecution)({ status: 'success' }, inaccessibleWorkflow),
				(0, executions_1.createExecution)({ status: 'success' }, inaccessibleWorkflow),
				(0, executions_1.createExecution)({ status: 'success' }, inaccessibleWorkflow),
			]);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({}, workflow),
				(0, executions_1.createExecution)({}, workflow),
			]);
			const [firstId, secondId] = await executionRepository.getAllIds();
			const executionMetadataRepository = di_1.Container.get(db_1.ExecutionMetadataRepository);
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
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const totalCompleted = 21;
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				...new Array(totalCompleted)
					.fill(null)
					.map(
						async () => await (0, executions_1.createExecution)({ status: 'success' }, workflow),
					),
			]);
			const query = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};
			const output = await executionService.findLatestCurrentAndCompleted(query);
			expect(output.results).toHaveLength(23);
			expect(output.count).toBe(totalCompleted);
			expect(output.estimated).toBe(false);
		});
		test('should handle zero current executions', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const totalFinished = 5;
			await Promise.all(
				new Array(totalFinished)
					.fill(null)
					.map(
						async () => await (0, executions_1.createExecution)({ status: 'success' }, workflow),
					),
			);
			const query = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};
			const output = await executionService.findLatestCurrentAndCompleted(query);
			expect(output.results).toHaveLength(totalFinished);
			expect(output.count).toBe(totalFinished);
			expect(output.estimated).toBe(false);
		});
		test('should handle zero completed executions', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
			]);
			const query = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};
			const output = await executionService.findLatestCurrentAndCompleted(query);
			expect(output.results).toHaveLength(3);
			expect(output.count).toBe(0);
			expect(output.estimated).toBe(false);
		});
		test('should handle zero executions', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			await Promise.all([
				(0, executions_1.createExecution)({ status: 'new' }, workflow),
				(0, executions_1.createExecution)({ status: 'new' }, workflow),
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				(0, executions_1.createExecution)({ status: 'running' }, workflow),
				(0, executions_1.createExecution)({ status: 'new' }, workflow),
				(0, executions_1.createExecution)({ status: 'new' }, workflow),
			]);
			const query = {
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
			await backend_test_utils_1.testDb.truncate(['AnnotationTagEntity', 'ExecutionAnnotation']);
		});
		test('should add and retrieve annotation', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const execution1 = await (0, executions_1.createExecution)({ status: 'success' }, workflow);
			const execution2 = await (0, executions_1.createExecution)({ status: 'success' }, workflow);
			const annotationTags = await (0, executions_1.createAnnotationTags)(['tag1', 'tag2', 'tag3']);
			await (0, executions_1.annotateExecution)(
				execution1.id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await (0, executions_1.annotateExecution)(
				execution2.id,
				{ vote: 'down', tags: [annotationTags[2].id] },
				[workflow.id],
			);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const execution = await (0, executions_1.createExecution)({ status: 'success' }, workflow);
			const annotationTags = await (0, executions_1.createAnnotationTags)(['tag1', 'tag2', 'tag3']);
			await (0, executions_1.annotateExecution)(
				execution.id,
				{ vote: 'up', tags: [annotationTags[0].id] },
				[workflow.id],
			);
			await (0, executions_1.annotateExecution)(
				execution.id,
				{ vote: 'down', tags: [annotationTags[1].id] },
				[workflow.id],
			);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const executions = await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
			]);
			const annotationTags = await (0, executions_1.createAnnotationTags)(['tag1', 'tag2', 'tag3']);
			await (0, executions_1.annotateExecution)(
				executions[0].id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await (0, executions_1.annotateExecution)(
				executions[1].id,
				{ vote: 'down', tags: [annotationTags[2].id] },
				[workflow.id],
			);
			const query = {
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const executions = await Promise.all([
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
				(0, executions_1.createExecution)({ status: 'success' }, workflow),
			]);
			const annotationTags = await (0, executions_1.createAnnotationTags)(['tag1', 'tag2', 'tag3']);
			await (0, executions_1.annotateExecution)(
				executions[0].id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await (0, executions_1.annotateExecution)(
				executions[1].id,
				{ vote: 'down', tags: [annotationTags[2].id] },
				[workflow.id],
			);
			const query = {
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
//# sourceMappingURL=execution.service.integration.test.js.map
