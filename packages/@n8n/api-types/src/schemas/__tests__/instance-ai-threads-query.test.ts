import { describe, expect, it } from 'vitest';
import { InstanceAiThreadsQuery } from '../instance-ai.schema';

describe('InstanceAiThreadsQuery', () => {
	it('retains defaults for existing clients', () => {
		expect(InstanceAiThreadsQuery.parse({})).toEqual({ page: 0, limit: 100 });
	});
	it('coerces pagination and trims search', () => {
		expect(InstanceAiThreadsQuery.parse({ page: '1', limit: '30', search: ' Invoice ' })).toEqual({
			page: 1,
			limit: 30,
			search: 'Invoice',
		});
	});
	it.each([
		{ page: -1 },
		{ page: 1.5 },
		{ page: 10001 },
		{ limit: 0 },
		{ limit: 101 },
		{ search: 'x'.repeat(501) },
	])('rejects invalid query %j', (query) => {
		expect(InstanceAiThreadsQuery.safeParse(query).success).toBe(false);
	});
});
