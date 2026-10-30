import { lintPolicyRules, lintRulesForMissingTypes } from '../policy-rule-lint';
import type { PolicyRule, PolicySelector } from '../policy-rule.types';

type RuleOverrides = Partial<PolicyRule> & Pick<PolicyRule, 'id' | 'selector'>;

const rule = (overrides: RuleOverrides): PolicyRule => ({
	action: 'allow',
	...overrides,
});

describe('lintRulesForMissingTypes', () => {
	it('returns no warnings when every rule is installed', () => {
		const rules = [
			rule({ id: 'a', selector: { kind: 'name', value: 'typeA' } }),
			rule({ id: 'b', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
		];

		expect(lintRulesForMissingTypes(rules, () => true)).toEqual([]);
	});

	it('flags each rule whose selector is not installed, carrying its id', () => {
		const rules = [
			rule({ id: 'installed', selector: { kind: 'name', value: 'typeA' } }),
			rule({ id: 'missing-one', selector: { kind: 'name', value: 'typeB' } }),
			rule({ id: 'missing-two', selector: { kind: 'package', value: 'n8n-nodes-missing' } }),
		];
		const isLoaded = (selector: PolicySelector) => selector.value === 'typeA';

		expect(lintRulesForMissingTypes(rules, isLoaded)).toEqual([
			{ kind: 'notLoaded', ruleId: 'missing-one' },
			{ kind: 'notLoaded', ruleId: 'missing-two' },
		]);
	});

	it('returns no warnings for an empty rule list', () => {
		expect(lintRulesForMissingTypes([], () => false)).toEqual([]);
	});
});

describe('lintPolicyRules', () => {
	const policedType = (name: string) => ({ name, baseName: name });
	const resolvePackage = () => null;

	it('returns no warnings when every rule is installed and none are shadowed', () => {
		const rules = [
			rule({ id: 'a', selector: { kind: 'name', value: 'typeA' } }),
			rule({ id: 'b', selector: { kind: 'name', value: 'typeB' } }),
		];

		expect(lintPolicyRules(rules, { resolvePackage, policedType, isLoaded: () => true })).toEqual(
			[],
		);
	});

	it('flags not-installed rules that are not shadowed, in rule order', () => {
		const rules = [
			rule({ id: 'a', selector: { kind: 'name', value: 'typeA' } }),
			rule({ id: 'b', selector: { kind: 'name', value: 'typeB' } }),
		];
		const isLoaded = (selector: PolicySelector) => selector.value !== 'typeB';

		expect(lintPolicyRules(rules, { resolvePackage, policedType, isLoaded })).toEqual([
			{ kind: 'notLoaded', ruleId: 'b' },
		]);
	});

	it('merges shadow and not-installed warnings, sorted by rule position rather than warning kind', () => {
		const rules = [
			rule({ id: 'a', selector: { kind: 'name', value: 'typeA' } }),
			rule({ id: 'b', selector: { kind: 'name', value: 'typeB' } }),
			// identical selector to `a`, so shadowed by it
			rule({ id: 'c', selector: { kind: 'name', value: 'typeA' } }),
		];
		const isLoaded = (selector: PolicySelector) => selector.value !== 'typeB';

		expect(lintPolicyRules(rules, { resolvePackage, policedType, isLoaded })).toEqual([
			{ kind: 'notLoaded', ruleId: 'b' },
			{ kind: 'shadowed', ruleId: 'c', shadowedByRuleId: 'a' },
		]);
	});

	it('lists the shadowed warning before the notLoaded warning for the same rule', () => {
		const ruleX = rule({ id: 'x', selector: { kind: 'name', value: 'typeX' } });
		// identical selector to `ruleX`, so shadowed by it, and separately stubbed as not installed
		const ruleY = rule({ id: 'y', selector: { kind: 'name', value: 'typeX' } });
		const notLoadedSelectors = new Set<PolicySelector>([ruleY.selector]);
		const isLoaded = (selector: PolicySelector) => !notLoadedSelectors.has(selector);

		expect(lintPolicyRules([ruleX, ruleY], { resolvePackage, policedType, isLoaded })).toEqual([
			{ kind: 'shadowed', ruleId: 'y', shadowedByRuleId: 'x' },
			{ kind: 'notLoaded', ruleId: 'y' },
		]);
	});

	it('returns no warnings for an empty rule list', () => {
		expect(lintPolicyRules([], { resolvePackage, policedType, isLoaded: () => true })).toEqual([]);
	});
});
