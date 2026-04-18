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

import type { WorkflowRepository } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InstanceAiTestController } from '../instance-ai-test.controller';
import type { InstanceAiService } from '../instance-ai.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

describe('InstanceAiTestController', () => {
	const instanceAiService = mock<InstanceAiService>();
	const threadRepo = mock<InstanceAiThreadRepository>();
	const workflowRepo = mock<WorkflowRepository>();
	const controller = new InstanceAiTestController(instanceAiService, threadRepo, workflowRepo);

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

	describe('reset', () => {
		it('should clear per-thread state and delete threads + workflows', async () => {
			threadRepo.find.mockResolvedValue([{ id: 't1' }, { id: 't2' }] as never);
			workflowRepo.find.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] as never);

			const result = await controller.reset();

			expect(instanceAiService.cancelAllBackgroundTasks).toHaveBeenCalled();
			expect(instanceAiService.clearThreadState).toHaveBeenCalledWith('t1');
			expect(instanceAiService.clearThreadState).toHaveBeenCalledWith('t2');
			expect(threadRepo.clear).toHaveBeenCalled();
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
