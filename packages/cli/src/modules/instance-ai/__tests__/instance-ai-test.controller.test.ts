import { z } from 'zod';

jest.mock('@n8n/instance-ai', () => ({
	createMemory: jest.fn(),
	workflowLoopStateSchema: z.string(),
	attemptRecordSchema: z.object({}),
	workflowBuildOutcomeSchema: z.string(),
	buildAgentTreeFromEvents: jest.fn(),
}));

jest.mock('../eval/execution.service', () => ({
	EvalExecutionService: jest.fn(),
}));

import type { UserRepository, WorkflowRepository } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

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
	const controller = new InstanceAiTestController(
		instanceAiService,
		threadRepo,
		workflowRepo,
		userRepo,
		memoryService,
	);

	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
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
			instanceAiService.startStuckBackgroundTaskForTest.mockResolvedValue(simulation);

			const result = await controller.startBackgroundTimeoutSimulation({
				userId: 'user-1',
				threadId: 'thread-1',
			});

			expect(memoryService.ensureThread).toHaveBeenCalledWith('user-1', 'thread-1');
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
			const deleteExecute = jest.fn().mockResolvedValue(undefined);
			const deleteQb = { execute: deleteExecute };
			const queryBuilder = { delete: jest.fn().mockReturnValue(deleteQb) };
			threadRepo.createQueryBuilder.mockReturnValue(queryBuilder as never);

			const result = await controller.reset();

			expect(instanceAiService.cancelAllBackgroundTasks).toHaveBeenCalled();
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
