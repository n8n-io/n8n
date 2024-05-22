import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionService } from '@/executions/execution.service';
import { mock } from 'jest-mock-extended';
import Container from 'typedi';
import { createWorkflow } from './shared/db/workflows';
import { createExecution } from './shared/db/executions';
import * as testDb from './shared/testDb';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { ExecutionSummaries } from '@/executions/execution.types';
import { ExecutionMetadataRepository } from '@/databases/repositories/executionMetadata.repository';

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
			executionRepository,
			Container.get(WorkflowRepository),
			mock(),
			mock(),
			mock(),
		);
	});

	afterEach(async () => {
		await testDb.truncate(['Execution']);
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
				startedAt: expect.any(String),
				stoppedAt: expect.any(String),
				waitTill: null,
				retrySuccessId: null,
				workflowName: expect.any(String),
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

		test('should filter executions by `metadata`', async () => {
			const workflow = await createWorkflow();

			const metadata = [{ key: 'myKey', value: 'myValue' }];

			await Promise.all([
				createExecution({ status: 'success', metadata }, workflow),
				createExecution({ status: 'error' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
				metadata,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 1,
				estimated: false,
				results: [expect.objectContaining({ status: 'success' })],
			});
		});

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

	describe('findAllActiveAndLatestFinished', () => {
		test('should return all active and latest 20 finished executions', async () => {
			const workflow = await createWorkflow();

			const totalFinished = 21;

			await Promise.all([
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				...new Array(totalFinished)
					.fill(null)
					.map(async () => await createExecution({ status: 'success' }, workflow)),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findAllRunningAndLatest(query);

			expect(output.results).toHaveLength(23); // 3 active + 20 finished (excludes 21st)
			expect(output.count).toBe(totalFinished); // 21 finished, excludes active
			expect(output.estimated).toBe(false);
		});

		test('should handle zero active executions', async () => {
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

			const output = await executionService.findAllRunningAndLatest(query);

			expect(output.results).toHaveLength(totalFinished); // 5 finished
			expect(output.count).toBe(totalFinished); // 5 finished, excludes active
			expect(output.estimated).toBe(false);
		});

		test('should handle zero finished executions', async () => {
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

			const output = await executionService.findAllRunningAndLatest(query);

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

			const output = await executionService.findAllRunningAndLatest(query);

			expect(output.results).toHaveLength(0);
			expect(output.count).toBe(0);
			expect(output.estimated).toBe(false);
		});
	});
});
