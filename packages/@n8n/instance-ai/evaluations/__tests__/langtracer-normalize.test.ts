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

	it('strips arbitrary export-only keys the strict schema would reject', () => {
		// LangTracer attaches keys like id/name/suiteId/timestamps to an exported
		// case; n8n's schema is `.strict()` and the loader aggregates errors, so a
		// single stray key fails the whole suite. Whitelisting to the schema's keys
		// (not blacklisting the two we happen to know) keeps the export loadable.
		const out = normalizeExportedCase({
			conversation: [{ role: 'user', text: 'hi' }],
			complexity: 'simple',
			id: 42,
			name: 'My case',
			suiteId: 7,
			createdAt: '2026-01-01',
			randomFutureKey: { nested: true },
		}) as Record<string, unknown>;
		// Real schema fields survive...
		expect(out.conversation).toEqual([{ role: 'user', text: 'hi' }]);
		expect(out.complexity).toBe('simple');
		// ...export-only keys are gone.
		for (const k of ['id', 'name', 'suiteId', 'createdAt', 'randomFutureKey']) {
			expect(k in out).toBe(false);
		}
	});

	it('keeps a real schema field (seedThread, incl. its endpoint) through the whitelist', () => {
		const out = normalizeExportedCase({
			seedThread: { threadId: 't1', endpoint: 'https://api.smith.langchain.com' },
			complexity: 'medium',
			id: 1,
		}) as Record<string, unknown>;
		expect(out.seedThread).toEqual({
			threadId: 't1',
			endpoint: 'https://api.smith.langchain.com',
		});
		expect('id' in out).toBe(false);
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
