import { z } from 'zod';

vi.mock('@n8n/instance-ai', () => ({
	workflowLoopStateSchema: z.string(),
	attemptRecordSchema: z.object({}),
	workflowBuildOutcomeSchema: z.string(),
	buildAgentTreeFromEvents: vi.fn(),
}));

vi.mock('../eval/execution.service', () => ({
	EvalExecutionService: vi.fn(),
}));

import type { ProjectRepository, UserRepository, WorkflowRepository } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiTestController } from '../instance-ai-test.controller';
import type { InstanceAiService } from '../instance-ai.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

describe('InstanceAiTestController', () => {
	const instanceAiService = mock<InstanceAiService>();
	const threadRepo = mock<InstanceAiThreadRepository>();
	const workflowRepo = mock<WorkflowRepository>();
	const userRepo = mock<UserRepository>();
	const memoryService = mock<InstanceAiMemoryService>();
	const projectRepo = mock<ProjectRepository>();
	const controller = new InstanceAiTestController(
		instanceAiService,
		threadRepo,
		workflowRepo,
		userRepo,
		memoryService,
		projectRepo,
	);

	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv, E2E_TESTS: 'true' };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('loadToolTrace', () => {
		it('should load trace events and activate slug', () => {
			const events = [{ kind: 'header' }];
			const req = mock<Request>({ body: { slug: 'my-test', events } });

			const result = controller.loadToolTrace(req);

			expect(instanceAiService.loadTraceEvents).toHaveBeenCalledWith('my-test', events);
			expect(instanceAiService.activateTraceSlug).toHaveBeenCalledWith('my-test');
			expect(result).toEqual({ ok: true, count: 1 });
		});

		it('should activate slug without events when none provided', () => {
			const req = mock<Request>({ body: { slug: 'my-test', events: undefined } });

			const result = controller.loadToolTrace(req);

			expect(instanceAiService.loadTraceEvents).not.toHaveBeenCalled();
			expect(instanceAiService.activateTraceSlug).toHaveBeenCalledWith('my-test');
			expect(result).toEqual({ ok: true, count: 0 });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;
			const req = mock<Request>({ body: { slug: 'test' } });

			expect(() => controller.loadToolTrace(req)).toThrow(ForbiddenError);
		});

		it('should throw ForbiddenError in production even when E2E_TESTS is set', () => {
			process.env.NODE_ENV = 'production';
			const req = mock<Request>({ body: { slug: 'test' } });

			expect(() => controller.loadToolTrace(req)).toThrow(ForbiddenError);
		});
	});

	describe('getToolTrace', () => {
		it('should return trace events for slug', () => {
			const events = [{ kind: 'tool-call' }];
			instanceAiService.getTraceEvents.mockReturnValue(events);
			const req = mock<Request>();
			const res = mock<Response>();

			const result = controller.getToolTrace(req, res, 'my-test');

			expect(instanceAiService.getTraceEvents).toHaveBeenCalledWith('my-test');
			expect(result).toEqual({ events });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;
			const req = mock<Request>();
			const res = mock<Response>();

			expect(() => controller.getToolTrace(req, res, 'my-test')).toThrow(ForbiddenError);
		});
	});

	describe('getIdleState', () => {
		it('should report idle when there is no running work', () => {
			instanceAiService.hasRunningWorkForTest.mockReturnValue(false);

			const result = controller.getIdleState();

			expect(instanceAiService.hasRunningWorkForTest).toHaveBeenCalled();
			expect(result).toEqual({ idle: true });
		});

		it('should report non-idle when there is running work', () => {
			instanceAiService.hasRunningWorkForTest.mockReturnValue(true);

			const result = controller.getIdleState();

			expect(instanceAiService.hasRunningWorkForTest).toHaveBeenCalled();
			expect(result).toEqual({ idle: false });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;

			expect(() => controller.getIdleState()).toThrow(ForbiddenError);
		});
	});

	describe('clearToolTrace', () => {
		it('should clear trace events for slug', () => {
			const req = mock<Request>();
			const res = mock<Response>();

			const result = controller.clearToolTrace(req, res, 'my-test');

			expect(instanceAiService.clearTraceEvents).toHaveBeenCalledWith('my-test');
			expect(result).toEqual({ ok: true });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;
			const req = mock<Request>();
			const res = mock<Response>();

			expect(() => controller.clearToolTrace(req, res, 'my-test')).toThrow(ForbiddenError);
		});
	});

	describe('background timeout simulation', () => {
		it('should create an owned thread and start a stuck background task', async () => {
			const user = { id: 'user-1' } as never;
			const simulation = {
				threadId: 'thread-1',
				runId: 'run-1',
				messageGroupId: 'mg-1',
				taskId: 'task-1',
				agentId: 'agent-1',
				timeoutAt: 123,
			};
			userRepo.findOneByOrFail.mockResolvedValue(user);
			projectRepo.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: 'personal-project-id',
			} as never);
			instanceAiService.startStuckBackgroundTaskForTest.mockResolvedValue(simulation);

			const result = await controller.startBackgroundTimeoutSimulation({
				userId: 'user-1',
				threadId: 'thread-1',
			});

			expect(memoryService.ensureThread).toHaveBeenCalledWith(
				'user-1',
				'thread-1',
				'personal-project-id',
			);
			expect(instanceAiService.startStuckBackgroundTaskForTest).toHaveBeenCalledWith(
				user,
				'thread-1',
			);
			expect(result).toEqual(simulation);
		});

		it('should run the liveness sweep at a simulated time', async () => {
			const result = await controller.runLivenessSweep({ now: 123 });

			expect(instanceAiService.runLivenessSweepForTest).toHaveBeenCalledWith(123);
			expect(result).toEqual({ ok: true });
		});
	});

	describe('reset', () => {
		it('should clear per-thread state and delete threads + workflows', async () => {
			threadRepo.find.mockResolvedValue([{ id: 't1' }, { id: 't2' }] as never);
			workflowRepo.find.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] as never);
			const deleteExecute = vi.fn().mockResolvedValue(undefined);
			const deleteQb = { execute: deleteExecute };
			const queryBuilder = { delete: vi.fn().mockReturnValue(deleteQb) };
			threadRepo.createQueryBuilder.mockReturnValue(queryBuilder as never);

			const result = await controller.reset();

			expect(instanceAiService.cancelAllBackgroundTasks).toHaveBeenCalled();
			expect(instanceAiService.clearTraceContextsForTest).toHaveBeenCalled();
			expect(instanceAiService.clearThreadState).toHaveBeenCalledWith('t1');
			expect(instanceAiService.clearThreadState).toHaveBeenCalledWith('t2');
			expect(queryBuilder.delete).toHaveBeenCalled();
			expect(deleteExecute).toHaveBeenCalled();
			expect(workflowRepo.delete).toHaveBeenCalledWith('w1');
			expect(workflowRepo.delete).toHaveBeenCalledWith('w2');
			expect(workflowRepo.delete).toHaveBeenCalledWith('w3');
			expect(result).toEqual({ ok: true, threadsDeleted: 2, workflowsDeleted: 3 });
		});

		it('should throw ForbiddenError when trace replay is not enabled', async () => {
			delete process.env.E2E_TESTS;

			await expect(controller.reset()).rejects.toThrow(ForbiddenError);
		});
	});
});
