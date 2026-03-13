import { describe, it, expect } from 'vitest';
import { defineWorkflow, webhook, NonRetriableError } from '../index';
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

describe('NonRetriableError', () => {
	it('should have correct name', () => {
		const error = new NonRetriableError('fatal failure');

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('NonRetriableError');
		expect(error.message).toBe('fatal failure');
	});
});
