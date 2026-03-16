import { describe, it, expect } from 'vitest';

import { validateWebhookRequest } from '../validate-webhook-schema';
import type { WebhookTriggerConfig } from '../../sdk/types';

function makeTrigger(schema?: Record<string, unknown>): WebhookTriggerConfig {
	return {
		type: 'webhook',
		config: {
			path: '/test',
			method: 'POST',
			...(schema ? { schema } : {}),
		},
	};
}

describe('validateWebhookRequest', () => {
	it('returns valid when no schema is defined', () => {
		const result = validateWebhookRequest(makeTrigger(), {
			body: { anything: true },
			headers: {},
			query: {},
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it('returns valid when body matches schema', () => {
		const trigger = makeTrigger({
			body: {
				type: 'object',
				properties: { message: { type: 'string' } },
				required: ['message'],
			},
		});
		const result = validateWebhookRequest(trigger, {
			body: { message: 'hello' },
			headers: {},
			query: {},
		});
		expect(result.valid).toBe(true);
	});

	it('returns errors when required body field is missing', () => {
		const trigger = makeTrigger({
			body: {
				type: 'object',
				properties: { message: { type: 'string' } },
				required: ['message'],
			},
		});
		const result = validateWebhookRequest(trigger, {
			body: { wrong: 'field' },
			headers: {},
			query: {},
		});
		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
		expect(result.errors!.length).toBeGreaterThan(0);
		expect(result.errors![0].path).toContain('/body');
		expect(result.errors![0].message).toContain('message');
	});

	it('returns errors when body field has wrong type', () => {
		const trigger = makeTrigger({
			body: {
				type: 'object',
				properties: { count: { type: 'number' } },
				required: ['count'],
			},
		});
		const result = validateWebhookRequest(trigger, {
			body: { count: 'not a number' },
			headers: {},
			query: {},
		});
		// ajv coerces types by default, so "123" would pass as number
		// but "not a number" should fail
		expect(result.valid).toBe(false);
	});

	it('validates query parameters', () => {
		const trigger = makeTrigger({
			query: {
				type: 'object',
				properties: {
					format: { type: 'string', enum: ['json', 'xml'] },
				},
				required: ['format'],
			},
		});

		const valid = validateWebhookRequest(trigger, {
			body: {},
			headers: {},
			query: { format: 'json' },
		});
		expect(valid.valid).toBe(true);

		const invalid = validateWebhookRequest(trigger, {
			body: {},
			headers: {},
			query: { format: 'csv' },
		});
		expect(invalid.valid).toBe(false);
		expect(invalid.errors![0].path).toContain('/query');
	});

	it('validates headers', () => {
		const trigger = makeTrigger({
			headers: {
				type: 'object',
				properties: {
					'x-api-key': { type: 'string' },
				},
				required: ['x-api-key'],
			},
		});

		const valid = validateWebhookRequest(trigger, {
			body: {},
			headers: { 'x-api-key': 'secret123' },
			query: {},
		});
		expect(valid.valid).toBe(true);

		const invalid = validateWebhookRequest(trigger, {
			body: {},
			headers: {},
			query: {},
		});
		expect(invalid.valid).toBe(false);
		expect(invalid.errors![0].path).toContain('/headers');
	});

	it('validates body, query, and headers together', () => {
		const trigger = makeTrigger({
			body: {
				type: 'object',
				properties: { name: { type: 'string' } },
				required: ['name'],
			},
			query: {
				type: 'object',
				properties: { page: { type: 'number' } },
				required: ['page'],
			},
		});

		const result = validateWebhookRequest(trigger, {
			body: {},
			headers: {},
			query: {},
		});
		expect(result.valid).toBe(false);
		expect(result.errors!.length).toBe(2);
		expect(result.errors!.some((e) => e.path.includes('/body'))).toBe(true);
		expect(result.errors!.some((e) => e.path.includes('/query'))).toBe(true);
	});

	it('allows optional fields to be missing', () => {
		const trigger = makeTrigger({
			body: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					age: { type: 'number' },
				},
				required: ['name'],
			},
		});
		const result = validateWebhookRequest(trigger, {
			body: { name: 'Alice' },
			headers: {},
			query: {},
		});
		expect(result.valid).toBe(true);
	});

	it('validates enum values', () => {
		const trigger = makeTrigger({
			body: {
				type: 'object',
				properties: {
					status: { type: 'string', enum: ['active', 'inactive'] },
				},
				required: ['status'],
			},
		});

		const valid = validateWebhookRequest(trigger, {
			body: { status: 'active' },
			headers: {},
			query: {},
		});
		expect(valid.valid).toBe(true);

		const invalid = validateWebhookRequest(trigger, {
			body: { status: 'unknown' },
			headers: {},
			query: {},
		});
		expect(invalid.valid).toBe(false);
	});
});
