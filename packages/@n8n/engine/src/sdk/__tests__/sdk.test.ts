import { describe, it, expect } from 'vitest';
import {
	defineWorkflow,
	webhook,
	SleepRequestedError,
	WaitUntilRequestedError,
	NonRetriableError,
} from '../index';
import type { WorkflowDefinition, ExecutionContext } from '../types';

describe('defineWorkflow', () => {
	it('should return the input definition unchanged', () => {
		const definition: WorkflowDefinition = {
			name: 'test-workflow',
			run: async (_ctx: ExecutionContext) => ({ result: 'ok' }),
		};

		const result = defineWorkflow(definition);

		expect(result).toBe(definition);
		expect(result.name).toBe('test-workflow');
		expect(result.run).toBe(definition.run);
	});

	it('should preserve triggers and settings', () => {
		const definition: WorkflowDefinition = {
			name: 'workflow-with-options',
			triggers: [{ type: 'manual', config: {} }],
			settings: { executionMode: 'queued' },
			run: async () => null,
		};

		const result = defineWorkflow(definition);

		expect(result.triggers).toEqual([{ type: 'manual', config: {} }]);
		expect(result.settings).toEqual({ executionMode: 'queued' });
	});
});

describe('webhook', () => {
	it('should create a WebhookTriggerConfig with defaults', () => {
		const result = webhook('/my-path');

		expect(result).toEqual({
			type: 'webhook',
			config: {
				path: '/my-path',
				method: 'POST',
				responseMode: 'lastNode',
			},
		});
	});

	it('should accept custom method', () => {
		const result = webhook('/hook', { method: 'GET' });

		expect(result.type).toBe('webhook');
		expect(result.config.method).toBe('GET');
		expect(result.config.responseMode).toBe('lastNode');
	});

	it('should accept custom responseMode', () => {
		const result = webhook('/hook', { responseMode: 'respondImmediately' });

		expect(result.config.responseMode).toBe('respondImmediately');
		expect(result.config.method).toBe('POST');
	});

	it('should accept both custom method and responseMode', () => {
		const result = webhook('/hook', { method: 'PUT', responseMode: 'allData' });

		expect(result).toEqual({
			type: 'webhook',
			config: {
				path: '/hook',
				method: 'PUT',
				responseMode: 'allData',
			},
		});
	});
});

describe('SleepRequestedError', () => {
	it('should carry sleepMs', () => {
		const error = new SleepRequestedError(5000);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('SleepRequestedError');
		expect(error.sleepMs).toBe(5000);
		expect(error.message).toBe('Sleep requested: 5000ms');
	});

	it('should carry intermediateState', () => {
		const state = { progress: 50, data: [1, 2, 3] };
		const error = new SleepRequestedError(1000, state);

		expect(error.sleepMs).toBe(1000);
		expect(error.intermediateState).toEqual(state);
	});

	it('should have undefined intermediateState when not provided', () => {
		const error = new SleepRequestedError(1000);

		expect(error.intermediateState).toBeUndefined();
	});
});

describe('WaitUntilRequestedError', () => {
	it('should carry date', () => {
		const date = new Date('2026-01-01T00:00:00.000Z');
		const error = new WaitUntilRequestedError(date);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('WaitUntilRequestedError');
		expect(error.date).toBe(date);
		expect(error.message).toBe('WaitUntil requested: 2026-01-01T00:00:00.000Z');
	});

	it('should carry intermediateState', () => {
		const date = new Date('2026-06-15T12:00:00.000Z');
		const state = { step: 3, partial: 'result' };
		const error = new WaitUntilRequestedError(date, state);

		expect(error.date).toBe(date);
		expect(error.intermediateState).toEqual(state);
	});

	it('should have undefined intermediateState when not provided', () => {
		const date = new Date();
		const error = new WaitUntilRequestedError(date);

		expect(error.intermediateState).toBeUndefined();
	});
});

describe('NonRetriableError', () => {
	it('should have correct name', () => {
		const error = new NonRetriableError('fatal failure');

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('NonRetriableError');
		expect(error.message).toBe('fatal failure');
	});
});
