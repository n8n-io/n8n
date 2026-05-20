import { TestScenarioSchema, WorkflowTestCaseSchema } from '../data/workflows/schema';

const minimalScenario = {
	name: 'happy-path',
	description: 'normal',
	dataSetup: 'webhook gets a submission',
	successCriteria: 'all good',
};

const minimalTestCase = {
	prompt: 'build me a thing',
	complexity: 'simple' as const,
	tags: ['test'],
	scenarios: [minimalScenario],
};

describe('TestScenarioSchema', () => {
	it('accepts a minimal scenario without binaryChecks', () => {
		expect(TestScenarioSchema.parse(minimalScenario)).toEqual(minimalScenario);
	});

	it('accepts binaryChecks as a string array', () => {
		const sc = { ...minimalScenario, binaryChecks: ['has_nodes', 'has_trigger'] };
		expect(TestScenarioSchema.parse(sc).binaryChecks).toEqual(['has_nodes', 'has_trigger']);
	});

	it('rejects binaryChecks of the wrong type', () => {
		const sc = { ...minimalScenario, binaryChecks: 42 };
		expect(() => TestScenarioSchema.parse(sc)).toThrow();
	});

	it('rejects binaryChecks whose entries are not strings', () => {
		const sc = { ...minimalScenario, binaryChecks: ['has_nodes', 7] };
		expect(() => TestScenarioSchema.parse(sc)).toThrow();
	});

	it('accepts annotations as an arbitrary record', () => {
		const sc = { ...minimalScenario, annotations: { code_necessary: true } };
		expect(TestScenarioSchema.parse(sc).annotations).toEqual({ code_necessary: true });
	});

	it('accepts the informational requires field', () => {
		const sc = { ...minimalScenario, requires: 'mock-server' };
		expect(TestScenarioSchema.parse(sc).requires).toBe('mock-server');
	});

	it('rejects scenarios missing required fields', () => {
		const bad = { ...minimalScenario, name: '' };
		expect(() => TestScenarioSchema.parse(bad)).toThrow();
	});
});

describe('WorkflowTestCaseSchema', () => {
	it('accepts a minimal valid case', () => {
		expect(WorkflowTestCaseSchema.parse(minimalTestCase)).toEqual(minimalTestCase);
	});

	it('rejects an empty scenarios array', () => {
		expect(() => WorkflowTestCaseSchema.parse({ ...minimalTestCase, scenarios: [] })).toThrow();
	});

	it('rejects unknown complexity values', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...minimalTestCase, complexity: 'gigantic' }),
		).toThrow();
	});

	it('propagates binaryChecks from nested scenarios', () => {
		const tc = {
			...minimalTestCase,
			scenarios: [{ ...minimalScenario, binaryChecks: ['has_trigger'] }],
		};
		expect(WorkflowTestCaseSchema.parse(tc).scenarios[0].binaryChecks).toEqual(['has_trigger']);
	});
});
