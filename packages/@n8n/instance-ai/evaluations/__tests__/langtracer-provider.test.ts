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
