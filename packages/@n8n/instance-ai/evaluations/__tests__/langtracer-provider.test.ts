import { casesFromExportedFiles } from '../langtracer/provider';

/** A minimal case body in lang-tracer's `export_suite` shape (n8n WorkflowTestCase). */
function validCase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		conversation: [{ role: 'user', text: 'build a thing' }],
		complexity: 'simple',
		tags: ['build'],
		executionScenarios: [
			{ name: 'happy', description: 'd', dataSetup: 'setup', successCriteria: 'ok' },
		],
		...overrides,
	};
}

describe('casesFromExportedFiles', () => {
	it('parses an exported suite into test cases with file slugs', () => {
		const cases = casesFromExportedFiles({ 'contact-form.json': validCase() }, { suite: 'demo' });
		expect(cases).toHaveLength(1);
		expect(cases[0].fileSlug).toBe('contact-form');
		expect(cases[0].testCase.complexity).toBe('simple');
	});

	it('folds legacy buildExpectations so the export validates against the n8n schema', () => {
		const cases = casesFromExportedFiles(
			{ 'c.json': validCase({ buildExpectations: ['has a trigger'] }) },
			{ suite: 'demo' },
		);
		expect(cases[0].testCase.outcomeExpectations).toEqual(['has a trigger']);
	});

	it('keeps an inline seed on a suite-sourced case', () => {
		const cases = casesFromExportedFiles(
			{
				'repair-it.json': validCase({
					seed: {
						mode: 'inline',
						messages: [
							{
								id: 'm1',
								type: 'llm',
								role: 'user',
								createdAt: '2026-06-29T09:00:00.000Z',
								content: [{ type: 'text', text: 'build it' }],
							},
						],
						workflows: [{ id: 'wKk3RmT9xQ2bVn7L', name: 'Batch loop', nodes: [], connections: {} }],
					},
				}),
			},
			{ suite: 'demo' },
		);
		const seed = cases[0].testCase.seed;
		expect(seed?.mode === 'inline' && seed.workflows[0].id).toBe('wKk3RmT9xQ2bVn7L');
	});

	// The normalizer whitelists to the schema's keys, so a hosted case carrying a
	// pre-union seed key would be STRIPPED and run unseeded — silently grading a
	// seeded case as build-from-scratch. Each removed key needs a raw-body guard.
	it.each([
		['seedFile', 'repair-it.seed'],
		['conversationSeed', { messages: [] }],
		['priorConversation', [{ role: 'user', text: 'earlier' }]],
		['seedThread', { threadId: 't1' }],
	])('refuses a suite-sourced case carrying the legacy %s key', (key, value) => {
		expect(() =>
			casesFromExportedFiles({ 'repair-it.json': validCase({ [key]: value }) }, { suite: 'demo' }),
		).toThrow(`${key}: no longer supported`);
	});

	it('names every legacy seed key a case carries, not just the first', () => {
		expect(() =>
			casesFromExportedFiles(
				{
					'repair-it.json': validCase({
						priorConversation: [{ role: 'user', text: 'earlier' }],
						seedThread: { threadId: 't1' },
					}),
				},
				{ suite: 'demo' },
			),
		).toThrow(/repair-it\.json[\s\S]*priorConversation[\s\S]*seedThread/);
	});

	it('aggregates validation errors and names the offending file', () => {
		expect(() =>
			casesFromExportedFiles(
				{ 'broken.json': validCase({ executionScenarios: [] }) },
				{ suite: 'demo' },
			),
		).toThrow(/broken\.json/);
	});

	it('applies --filter by file slug', () => {
		const cases = casesFromExportedFiles(
			{ 'keep-me.json': validCase(), 'drop-me.json': validCase() },
			{ suite: 'demo', filter: 'keep' },
		);
		expect(cases.map((c) => c.fileSlug)).toEqual(['keep-me']);
	});

	it('applies --exclude by file slug', () => {
		const cases = casesFromExportedFiles(
			{ 'keep-me.json': validCase(), 'drop-me.json': validCase() },
			{ suite: 'demo', exclude: 'drop' },
		);
		expect(cases.map((c) => c.fileSlug)).toEqual(['keep-me']);
	});

	it('selects by --tier via the datasets field', () => {
		const cases = casesFromExportedFiles(
			{
				'pr-case.json': validCase({ datasets: ['pr', 'full'] }),
				'full-case.json': validCase({ datasets: ['full'] }),
			},
			{ suite: 'demo', tier: 'pr' },
		);
		expect(cases.map((c) => c.fileSlug)).toEqual(['pr-case']);
	});

	it('throws when no case matches the requested tier', () => {
		expect(() =>
			casesFromExportedFiles(
				{ 'c.json': validCase({ datasets: ['full'] }) },
				{ suite: 'demo', tier: 'pr' },
			),
		).toThrow(/No test cases match --tier "pr"/);
	});
});
