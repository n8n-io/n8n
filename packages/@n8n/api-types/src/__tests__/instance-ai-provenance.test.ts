import { InstanceAiProvenanceListQuery } from '../instance-ai-provenance';

describe('InstanceAiProvenanceListQuery', () => {
	it('uses 50 when the query has no limit', () => {
		expect(InstanceAiProvenanceListQuery.safeParse({}).data).toEqual({ limit: 50 });
	});

	it.each([
		['1', 1],
		['37', 37],
		['100', 100],
	])('converts the query string %s to the number %d', (raw, expected) => {
		expect(InstanceAiProvenanceListQuery.safeParse({ limit: raw }).data).toEqual({
			limit: expected,
		});
	});

	it.each(['0', '101', '-5', '2.5', 'many'])('rejects the limit %s', (raw) => {
		expect(InstanceAiProvenanceListQuery.safeParse({ limit: raw }).success).toBe(false);
	});
});
