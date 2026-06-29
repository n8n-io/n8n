import { normalizeExportedCase } from '../langtracer/normalize';

describe('normalizeExportedCase', () => {
	it('folds legacy buildExpectations into outcomeExpectations', () => {
		const out = normalizeExportedCase({
			conversation: [{ role: 'user', text: 'hi' }],
			buildExpectations: ['the workflow has a webhook trigger'],
		}) as Record<string, unknown>;
		expect(out.buildExpectations).toBeUndefined();
		expect(out.outcomeExpectations).toEqual(['the workflow has a webhook trigger']);
	});

	it('merges legacy buildExpectations after existing outcomeExpectations', () => {
		const out = normalizeExportedCase({
			outcomeExpectations: ['a'],
			buildExpectations: ['b', 'c'],
		}) as Record<string, unknown>;
		expect(out.outcomeExpectations).toEqual(['a', 'b', 'c']);
	});

	it('ignores non-string entries in buildExpectations', () => {
		const out = normalizeExportedCase({
			buildExpectations: ['keep', 42, null, 'also'],
		}) as Record<string, unknown>;
		expect(out.outcomeExpectations).toEqual(['keep', 'also']);
	});

	it('is a no-op once lang-tracer emits the process/outcome split', () => {
		const out = normalizeExportedCase({
			conversation: [{ role: 'user', text: 'hi' }],
			processExpectations: ['asked a clarifying question'],
			outcomeExpectations: ['has a trigger'],
		}) as Record<string, unknown>;
		expect(out.processExpectations).toEqual(['asked a clarifying question']);
		expect(out.outcomeExpectations).toEqual(['has a trigger']);
		expect('buildExpectations' in out).toBe(false);
	});

	it('drops dispatch-only prompt/scenarios keys', () => {
		const out = normalizeExportedCase({
			conversation: [{ role: 'user', text: 'hi' }],
			prompt: 'hi',
			scenarios: [{ name: 's' }],
		}) as Record<string, unknown>;
		expect('prompt' in out).toBe(false);
		expect('scenarios' in out).toBe(false);
	});

	it('returns non-object input unchanged', () => {
		expect(normalizeExportedCase(null)).toBeNull();
		expect(normalizeExportedCase('x')).toBe('x');
		expect(normalizeExportedCase([1, 2])).toEqual([1, 2]);
	});

	it('does not mutate the input object', () => {
		const input = { buildExpectations: ['x'] };
		normalizeExportedCase(input);
		expect(input.buildExpectations).toEqual(['x']);
	});
});
