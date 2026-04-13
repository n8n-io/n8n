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

import type { Request } from 'express';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InstanceAiTestController } from '../instance-ai-test.controller';
import type { InstanceAiService } from '../instance-ai.service';

describe('InstanceAiTestController', () => {
	const instanceAiService = mock<InstanceAiService>();
	const controller = new InstanceAiTestController(instanceAiService);

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

			const result = controller.getToolTrace(req, 'my-test');

			expect(instanceAiService.getTraceEvents).toHaveBeenCalledWith('my-test');
			expect(result).toEqual({ events });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;
			const req = mock<Request>();

			expect(() => controller.getToolTrace(req, 'my-test')).toThrow(ForbiddenError);
		});
	});

	describe('clearToolTrace', () => {
		it('should clear trace events for slug', () => {
			const req = mock<Request>();

			const result = controller.clearToolTrace(req, 'my-test');

			expect(instanceAiService.clearTraceEvents).toHaveBeenCalledWith('my-test');
			expect(result).toEqual({ ok: true });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;
			const req = mock<Request>();

			expect(() => controller.clearToolTrace(req, 'my-test')).toThrow(ForbiddenError);
		});
	});

	describe('drainBackgroundTasks', () => {
		it('should cancel all background tasks and return count', () => {
			instanceAiService.cancelAllBackgroundTasks.mockReturnValue(3);

			const result = controller.drainBackgroundTasks();

			expect(instanceAiService.cancelAllBackgroundTasks).toHaveBeenCalled();
			expect(result).toEqual({ ok: true, cancelled: 3 });
		});

		it('should throw ForbiddenError when trace replay is not enabled', () => {
			delete process.env.E2E_TESTS;

			expect(() => controller.drainBackgroundTasks()).toThrow(ForbiddenError);
		});
	});
});
