import { lintRulesForShadowing } from '../policy-shadow-lint';
import type { PolicyRule } from '../policy-rule.types';

type RuleOverrides = Partial<PolicyRule> & Pick<PolicyRule, 'id' | 'selector'>;

const rule = (overrides: RuleOverrides): PolicyRule => ({
	action: 'allow',
	...overrides,
});

/** Stands in for `NodeTypes.resolveBaseName`: `gmailTool` is a synthetic variant of `gmail`. */
const policedType = (name: string) => ({
	name,
	baseName: name === 'n8n-nodes-base.gmailTool' ? 'n8n-nodes-base.gmail' : name,
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

	it('flags a name rule for a synthetic tool variant placed after the rule for its base node', () => {
		const rules = [
			rule({ id: 'allow-gmail', selector: { kind: 'name', value: 'n8n-nodes-base.gmail' } }),
			rule({
				id: 'deny-gmail-tool',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.gmailTool' },
			}),
		];

		expect(lintRulesForShadowing(rules, undefined, policedType)).toEqual([
			{ ruleId: 'deny-gmail-tool', shadowedByRuleId: 'allow-gmail' },
		]);
	});

	it('does not flag a base node rule placed after the rule for its synthetic tool variant', () => {
		// The base rule still matches the base node itself, which the variant rule never does.
		const rules = [
			rule({
				id: 'deny-gmail-tool',
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.gmailTool' },
			}),
			rule({ id: 'allow-gmail', selector: { kind: 'name', value: 'n8n-nodes-base.gmail' } }),
		];

		expect(lintRulesForShadowing(rules, undefined, policedType)).toEqual([]);
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

	it('flags a shadow via a custom resolver, for a type whose package is not part of its name', () => {
		// Stands in for the `credential-types` resolver: a credential type name (e.g.
		// `slackApi`) carries no package prefix, unlike a node type.
		const resolvePackage = (typeName: string) =>
			typeName === 'slackApi' ? 'n8n-nodes-base' : null;
		const rules = [
			rule({ id: 'allow-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({ id: 'deny-slack-api', action: 'deny', selector: { kind: 'name', value: 'slackApi' } }),
		];

		expect(lintRulesForShadowing(rules, resolvePackage)).toEqual([
			{ ruleId: 'deny-slack-api', shadowedByRuleId: 'allow-package' },
		]);
	});

	it('does not flag a name rule whose package the resolver cannot determine', () => {
		const resolvePackage = (typeName: string) =>
			typeName === 'slackApi' ? 'n8n-nodes-base' : null;
		const rules = [
			rule({ id: 'allow-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({ id: 'deny-other-api', action: 'deny', selector: { kind: 'name', value: 'otherApi' } }),
		];

		expect(lintRulesForShadowing(rules, resolvePackage)).toEqual([]);
	});

	it('picks the earlier of a name match and a package match, whichever ran first', () => {
		// A name selector shadowed by the same exact name earlier, and separately by an earlier
		// package rule for its package: whichever of the two occurred first should be reported.
		const nameFirst = [
			rule({ id: 'earlier-name', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
			rule({ id: 'later-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({ id: 'later-name', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
		];

		expect(lintRulesForShadowing(nameFirst)).toEqual([
			{ ruleId: 'later-name', shadowedByRuleId: 'earlier-name' },
		]);

		const packageFirst = [
			rule({ id: 'earlier-package', selector: { kind: 'package', value: 'n8n-nodes-base' } }),
			rule({ id: 'later-name-1', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
			rule({ id: 'later-name-2', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } }),
		];

		expect(lintRulesForShadowing(packageFirst)).toEqual([
			{ ruleId: 'later-name-1', shadowedByRuleId: 'earlier-package' },
			{ ruleId: 'later-name-2', shadowedByRuleId: 'earlier-package' },
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
