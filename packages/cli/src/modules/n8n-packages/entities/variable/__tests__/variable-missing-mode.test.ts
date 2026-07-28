import {
	variableBlockingFailures,
	variableMissingModeCreates,
	variableMissingModeUsesPackageValue,
} from '../variable-missing-mode';
import type { VariableImportPlan } from '../variable.types';

const plan: VariableImportPlan = {
	matched: ['API_URL'],
	missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
	creations: [],
};

describe('variableMissingModeCreates', () => {
	it.each([
		['do-nothing', false],
		['must-preexist', false],
		['create-stub', true],
		['create-with-value', true],
	] as const)('reports %s as creates=%s', (mode, creates) => {
		expect(variableMissingModeCreates(mode)).toBe(creates);
	});
});

describe('variableMissingModeUsesPackageValue', () => {
	it.each([
		['do-nothing', false],
		['must-preexist', false],
		['create-stub', false],
		['create-with-value', true],
	] as const)('reports %s as usesPackageValue=%s', (mode, usesPackageValue) => {
		expect(variableMissingModeUsesPackageValue(mode)).toBe(usesPackageValue);
	});
});

describe('variableBlockingFailures', () => {
	it('blocks on every unresolved requirement under must-preexist', () => {
		expect(variableBlockingFailures('must-preexist', plan)).toEqual(plan.missing);
	});

	it.each(['do-nothing', 'create-stub', 'create-with-value'] as const)(
		'never blocks under %s',
		(mode) => {
			expect(variableBlockingFailures(mode, plan)).toEqual([]);
		},
	);

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
