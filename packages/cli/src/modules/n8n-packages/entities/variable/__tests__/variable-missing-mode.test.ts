import { variableBlockingFailures, variableMissingModeCreates } from '../variable-missing-mode';
import type { VariableImportPlan } from '../variable.types';

const plan: VariableImportPlan = {
	matched: ['API_URL'],
	missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
	creations: [],
};

describe('variableMissingModeCreates', () => {
	it('creates only under create-stub', () => {
		expect(variableMissingModeCreates('create-stub')).toBe(true);
		expect(variableMissingModeCreates('do-nothing')).toBe(false);
		expect(variableMissingModeCreates('must-preexist')).toBe(false);
	});
});

describe('variableBlockingFailures', () => {
	it('blocks on every unresolved requirement under must-preexist', () => {
		expect(variableBlockingFailures('must-preexist', plan)).toEqual(plan.missing);
	});

	it('never blocks under do-nothing', () => {
		expect(variableBlockingFailures('do-nothing', plan)).toEqual([]);
	});

	it('never blocks under create-stub, since the stub resolves the requirement', () => {
		expect(variableBlockingFailures('create-stub', plan)).toEqual([]);
	});

	it('reports nothing when every requirement resolved', () => {
		expect(
			variableBlockingFailures('must-preexist', {
				matched: ['API_URL'],
				missing: [],
				creations: [],
			}),
		).toEqual([]);
	});
});
