import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { CaptureService } from '../capture.service';
import type { WorkflowTest } from '../database/entities/workflow-test.entity';
import type { WorkflowTestRepository } from '../database/repositories/workflow-test.repository';
import type { WorkflowTestRunnerService } from '../workflow-test-runner.service';
import { WorkflowTestsController } from '../workflow-tests.controller';
import type { WorkflowTestRunResult } from '../workflow-tests.types';

describe('WorkflowTestsController', () => {
	const captureService = mock<CaptureService>();
	const repository = mock<WorkflowTestRepository>();
	const runnerService = mock<WorkflowTestRunnerService>();

	let controller: WorkflowTestsController;

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new WorkflowTestsController(captureService, repository, runnerService);
	});

	function buildTest(overrides: Partial<WorkflowTest> = {}): WorkflowTest {
		return {
			id: 'test-1',
			name: 'My Test',
			workflowId: 'workflow-1',
			sourceExecutionId: 'execution-0',
			triggerNodeName: 'Trigger',
			fixtures: { Trigger: [{ json: { a: 1 } }] },
			expectations: [{ nodeName: 'Set', executionIndex: 1, outputs: [[{ json: { a: 1 } }]] }],
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
			...overrides,
		} as unknown as WorkflowTest;
	}

	describe('create', () => {
		it('captures from the execution and saves a new test', async () => {
			const test = buildTest();
			captureService.captureFromExecution.mockResolvedValue({
				capture: {
					triggerNodeName: 'Trigger',
					fixtures: test.fixtures,
					expectations: test.expectations,
				},
				workflowId: 'workflow-1',
			});
			repository.create.mockReturnValue(test);
			repository.save.mockResolvedValue(test);

			const req = {
				body: { executionId: 'execution-0', name: 'My Test' },
			} as unknown as AuthenticatedRequest<{}, {}, { executionId?: string; name?: string }>;
			const res = mock<Response>();

			const result = await controller.create(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			expect(captureService.captureFromExecution).toHaveBeenCalledWith('execution-0');
			expect(repository.create).toHaveBeenCalledWith({
				name: 'My Test',
				workflowId: 'workflow-1',
				sourceExecutionId: 'execution-0',
				triggerNodeName: 'Trigger',
				fixtures: test.fixtures,
				expectations: test.expectations,
			});
			expect(repository.save).toHaveBeenCalledWith(test);
			expect(result).toEqual({
				id: 'test-1',
				name: 'My Test',
				workflowId: 'workflow-1',
				sourceExecutionId: 'execution-0',
				triggerNodeName: 'Trigger',
				mockedNodeNames: ['Trigger'],
				assertedNodeNames: ['Set'],
				createdAt: '2026-01-01T00:00:00.000Z',
			});
		});

		it('defaults the name when none is provided', async () => {
			const test = buildTest({ name: 'Test from execution execution-0' });
			captureService.captureFromExecution.mockResolvedValue({
				capture: {
					triggerNodeName: 'Trigger',
					fixtures: test.fixtures,
					expectations: test.expectations,
				},
				workflowId: 'workflow-1',
			});
			repository.create.mockReturnValue(test);
			repository.save.mockResolvedValue(test);

			const req = {
				body: { executionId: 'execution-0' },
			} as unknown as AuthenticatedRequest<{}, {}, { executionId?: string; name?: string }>;

			await controller.create(req, mock<Response>());

			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'Test from execution execution-0' }),
			);
		});

		it('throws BadRequestError when executionId is missing', async () => {
			const req = {
				body: {},
			} as unknown as AuthenticatedRequest<{}, {}, { executionId?: string; name?: string }>;

			await expect(controller.create(req, mock<Response>())).rejects.toThrow(BadRequestError);
			expect(captureService.captureFromExecution).not.toHaveBeenCalled();
		});
	});

	describe('list', () => {
		it('returns summaries for the given workflowId ordered by createdAt desc', async () => {
			const tests = [buildTest()];
			repository.find.mockResolvedValue(tests);

			const req = {
				query: { workflowId: 'workflow-1' },
			} as unknown as AuthenticatedRequest<{}, {}, {}, { workflowId?: string }>;

			const result = await controller.list(req);

			expect(repository.find).toHaveBeenCalledWith({
				where: { workflowId: 'workflow-1' },
				order: { createdAt: 'DESC' },
			});
			expect(result).toEqual([
				{
					id: 'test-1',
					name: 'My Test',
					workflowId: 'workflow-1',
					sourceExecutionId: 'execution-0',
					triggerNodeName: 'Trigger',
					mockedNodeNames: ['Trigger'],
					assertedNodeNames: ['Set'],
					createdAt: '2026-01-01T00:00:00.000Z',
				},
			]);
		});

		it('throws BadRequestError when workflowId is missing', async () => {
			const req = {
				query: {},
			} as unknown as AuthenticatedRequest<{}, {}, {}, { workflowId?: string }>;

			await expect(controller.list(req)).rejects.toThrow(BadRequestError);
			expect(repository.find).not.toHaveBeenCalled();
		});
	});

	describe('run', () => {
		it('runs the test and returns the result', async () => {
			const test = buildTest();
			repository.findOneBy.mockResolvedValue(test);
			const runResult = mock<WorkflowTestRunResult>();
			runnerService.runTest.mockResolvedValue(runResult);

			const req = mock<AuthenticatedRequest<{ id: string }>>({
				params: { id: 'test-1' },
				user: { id: 'user-1' },
			});

			const result = await controller.run(req, mock());

			expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'test-1' });
			expect(runnerService.runTest).toHaveBeenCalledWith(test, 'user-1');
			expect(result).toBe(runResult);
		});

		it('throws NotFoundError when the test does not exist', async () => {
			repository.findOneBy.mockResolvedValue(null);

			const req = mock<AuthenticatedRequest<{ id: string }>>({
				params: { id: 'missing' },
				user: { id: 'user-1' },
			});

			await expect(controller.run(req, mock())).rejects.toThrow(NotFoundError);
			expect(runnerService.runTest).not.toHaveBeenCalled();
		});
	});

	describe('remove', () => {
		it('deletes the test and returns success', async () => {
			const req = mock<AuthenticatedRequest<{ id: string }>>({
				params: { id: 'test-1' },
			});

			const result = await controller.remove(req);

			expect(repository.delete).toHaveBeenCalledWith({ id: 'test-1' });
			expect(result).toEqual({ success: true });
		});
	});
});
