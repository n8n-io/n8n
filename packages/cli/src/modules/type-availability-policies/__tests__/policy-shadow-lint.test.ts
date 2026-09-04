import { lintRulesForShadowing } from '../policy-shadow-lint';
import type { PolicyRule } from '../policy-rule.types';

type RuleOverrides = Partial<PolicyRule> & Pick<PolicyRule, 'id' | 'selector'>;

const rule = (overrides: RuleOverrides): PolicyRule => ({
	action: 'allow',
	...overrides,
});

describe('lintRulesForShadowing', () => {
	it('flags a later name rule shadowed by an earlier package rule for the same package', () => {
		const rules = [
			rule({ id: 'allow-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({
				id: 'deny-slack',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			}),
		];

		expect(lintRulesForShadowing(rules)).toEqual([
			{ ruleId: 'deny-slack', shadowedByRuleId: 'allow-package' },
		]);
	});

	it.each([
		[
			'different packages',
			{ kind: 'package', value: 'n8n-nodes-base' } as const,
			{ kind: 'package', value: 'n8n-nodes-other' } as const,
		],
		[
			'different type names',
			{ kind: 'name', value: 'n8n-nodes-base.slack' } as const,
			{ kind: 'name', value: 'n8n-nodes-base.gmail' } as const,
		],
		[
			'a name rule followed by an unrelated package rule',
			{ kind: 'name', value: 'n8n-nodes-base.slack' } as const,
			{ kind: 'package', value: 'n8n-nodes-other' } as const,
		],
	])('does not flag disjoint selectors (%s)', (_description, earlierSelector, laterSelector) => {
		const rules = [
			rule({ id: 'earlier', selector: earlierSelector }),
			rule({ id: 'later', selector: laterSelector }),
		];

		expect(lintRulesForShadowing(rules)).toEqual([]);
	});

	it('does not flag a name rule followed by a package rule for its own package', () => {
		// A single type can never cover a whole package, so this direction never shadows.
		const rules = [
			rule({ id: 'earlier', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
			rule({ id: 'later', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
		];

		expect(lintRulesForShadowing(rules)).toEqual([]);
	});

	it('flags identical selectors as shadowing even when the actions differ', () => {
		const rules = [
			rule({
				id: 'allow-slack',
				action: 'allow',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			}),
			rule({
				id: 'deny-slack',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			}),
		];

		expect(lintRulesForShadowing(rules)).toEqual([
			{ ruleId: 'deny-slack', shadowedByRuleId: 'allow-slack' },
		]);
	});

	it('reports the earliest shadowing rule when more than one earlier rule would match', () => {
		const rules = [
			rule({ id: 'first-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({ id: 'second-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({ id: 'later-name', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
		];

		expect(lintRulesForShadowing(rules)).toEqual([
			{ ruleId: 'second-package', shadowedByRuleId: 'first-package' },
			{ ruleId: 'later-name', shadowedByRuleId: 'first-package' },
		]);
	});

	it('returns no warnings for an empty or single-rule list', () => {
		expect(lintRulesForShadowing([])).toEqual([]);
		expect(
			lintRulesForShadowing([
				rule({ id: 'only', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
			]),
		).toEqual([]);
	});
});
