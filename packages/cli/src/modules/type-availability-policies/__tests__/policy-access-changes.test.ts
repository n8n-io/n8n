import type { TypeAccessChange } from '@n8n/api-types';

import { applyAccessChanges } from '../policy-access-changes';
import { evaluateRules, nodeTypePackageResolver, type PolicedType } from '../policy-evaluator';
import type { PolicyAction, PolicyRule } from '../policy-rule.types';
import { lintRulesForShadowing } from '../policy-shadow-lint';

const SLACK = 'n8n-nodes-base.slack';
const NOTION = 'n8n-nodes-base.notion';
const GMAIL = 'n8n-nodes-base.gmail';
const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';
const CODE = 'n8n-nodes-base.code';
const COMMUNITY = 'n8n-nodes-community.thing';

/** Stands in for `NodeTypes.resolveBaseName`: `gmailTool` is a generated variant of `gmail`. */
const nodePolicedType = (name: string): PolicedType => ({
	name,
	baseName: name === GMAIL_TOOL ? GMAIL : name,
});

/** `googleOAuth2Api` and `googleSheetsOAuth2Api` are built on `oAuth2Api`. */
const credentialAncestors: Record<string, string[]> = {
	googleOAuth2Api: ['oAuth2Api'],
	googleSheetsOAuth2Api: ['googleOAuth2Api', 'oAuth2Api'],
};
const credentialPolicedType = (name: string): PolicedType => ({
	name,
	baseName: name,
	ancestors: credentialAncestors[name] ?? [],
});
const credentialPackageResolver = () => null;

const nodeResolvers = () => {
	let next = 0;
	return {
		resolvePackage: nodeTypePackageResolver,
		policedType: nodePolicedType,
		newRuleId: () => `new-${++next}`,
	};
};

const credentialResolvers = () => ({
	...nodeResolvers(),
	resolvePackage: credentialPackageResolver,
	policedType: credentialPolicedType,
});

const rule = (id: string, action: PolicyAction, selector: PolicyRule['selector']): PolicyRule => ({
	id,
	action,
	selector,
});

const accessOf = (
	rules: readonly PolicyRule[],
	typeName: string,
	defaultAction: PolicyAction = 'allow',
	policedType = nodePolicedType,
	resolvePackage = nodeTypePackageResolver,
) => evaluateRules(rules, defaultAction, policedType(typeName), resolvePackage).action;

/** Every type named by a rule, plus extra types: these are the ones whose verdict can move. */
const typesToCompare = (rules: readonly PolicyRule[], extra: readonly string[]) => [
	...new Set([
		...rules.filter((r) => r.selector.kind === 'name').map((r) => r.selector.value),
		...extra,
	]),
];

function expectOnlyChangedTypesMoved(
	before: readonly PolicyRule[],
	after: readonly PolicyRule[],
	changes: readonly TypeAccessChange[],
	extra: readonly string[],
	defaultAction: PolicyAction = 'allow',
) {
	const changed = new Set(changes.map((change) => change.type));
	const decidingRuleId = (typeName: string) =>
		evaluateRules(before, defaultAction, nodePolicedType(typeName), nodeTypePackageResolver)
			.matchedRuleId;
	// A variant that the rule of its base decided follows the base by design.
	const followsChangedBase = (typeName: string) => {
		const { baseName } = nodePolicedType(typeName);
		return (
			baseName !== typeName &&
			changed.has(baseName) &&
			decidingRuleId(typeName) === decidingRuleId(baseName)
		);
	};

	for (const typeName of typesToCompare(before, extra)) {
		if (changed.has(typeName) || followsChangedBase(typeName)) continue;
		expect({ typeName, access: accessOf(after, typeName, defaultAction) }).toEqual({
			typeName,
			access: accessOf(before, typeName, defaultAction),
		});
	}
}

describe('applyAccessChanges', () => {
	it('denies two node types under a default allow and leaves the others alone', () => {
		const changes: TypeAccessChange[] = [
			{ type: SLACK, access: 'deny' },
			{ type: NOTION, access: 'deny' },
		];

		const after = applyAccessChanges([], changes, nodeResolvers());

		expect(accessOf(after, SLACK)).toBe('deny');
		expect(accessOf(after, NOTION)).toBe('deny');
		expect(accessOf(after, CODE)).toBe('allow');
		expect(lintRulesForShadowing(after, nodeTypePackageResolver, nodePolicedType)).toEqual([]);
	});

	it('allows one node type of a denied package and keeps the rest of the package denied', () => {
		const before = [rule('deny-base', 'deny', { kind: 'package', value: 'n8n-nodes-base' })];
		const changes: TypeAccessChange[] = [{ type: SLACK, access: 'allow' }];

		const after = applyAccessChanges(before, changes, nodeResolvers());

		expect(accessOf(after, SLACK)).toBe('allow');
		expect(accessOf(after, CODE)).toBe('deny');
		expect(accessOf(after, COMMUNITY)).toBe('allow');
		expect(lintRulesForShadowing(after, nodeTypePackageResolver, nodePolicedType)).toEqual([]);
	});

	it('allows one credential type under an extends deny and keeps its siblings denied', () => {
		const before = [rule('deny-oauth2', 'deny', { kind: 'extends', value: 'oAuth2Api' })];
		const changes: TypeAccessChange[] = [{ type: 'googleSheetsOAuth2Api', access: 'allow' }];

		const after = applyAccessChanges(before, changes, credentialResolvers());

		const credentialAccess = (name: string) =>
			accessOf(after, name, 'allow', credentialPolicedType, credentialPackageResolver);
		expect(credentialAccess('googleSheetsOAuth2Api')).toBe('allow');
		expect(credentialAccess('googleOAuth2Api')).toBe('deny');
		expect(credentialAccess('oAuth2Api')).toBe('deny');
		expect(lintRulesForShadowing(after, credentialPackageResolver, credentialPolicedType)).toEqual(
			[],
		);
	});

	it('inherit removes every name rule for the type, so a package rule decides it', () => {
		const before = [
			rule('allow-slack', 'allow', { kind: 'name', value: SLACK }),
			rule('deny-base', 'deny', { kind: 'package', value: 'n8n-nodes-base' }),
			rule('deny-slack-again', 'deny', { kind: 'name', value: SLACK }),
		];

		const after = applyAccessChanges(before, [{ type: SLACK, access: 'inherit' }], nodeResolvers());

		expect(after.map((r) => r.id)).toEqual(['deny-base']);
		expect(accessOf(after, SLACK)).toBe('deny');
	});

	it('inherit keeps an extends rule that names the credential type', () => {
		const before = [rule('deny-oauth2', 'deny', { kind: 'extends', value: 'oAuth2Api' })];

		const after = applyAccessChanges(
			before,
			[{ type: 'oAuth2Api', access: 'inherit' }],
			credentialResolvers(),
		);

		expect(after).toEqual(before);
	});

	it('takes the place of a shadowed name rule instead of leaving it shadowed', () => {
		const before = [
			rule('allow-base', 'allow', { kind: 'package', value: 'n8n-nodes-base' }),
			rule('deny-slack', 'deny', { kind: 'name', value: SLACK }),
		];
		const changes: TypeAccessChange[] = [{ type: SLACK, access: 'deny' }];

		const after = applyAccessChanges(before, changes, nodeResolvers());

		expect(after.map((r) => r.id)).toEqual(['new-1', 'allow-base']);
		expect(accessOf(after, SLACK)).toBe('deny');
		expectOnlyChangedTypesMoved(before, after, changes, [CODE]);
	});

	it('keeps the rule id when the deciding rule already gives the requested access', () => {
		const before = [rule('deny-slack', 'deny', { kind: 'name', value: SLACK })];

		const after = applyAccessChanges(before, [{ type: SLACK, access: 'deny' }], nodeResolvers());

		expect(after).toEqual(before);
	});

	it('adds a rule when the type has the requested access only by default', () => {
		const after = applyAccessChanges([], [{ type: SLACK, access: 'allow' }], nodeResolvers());

		expect(after).toEqual([rule('new-1', 'allow', { kind: 'name', value: SLACK })]);
	});

	it('writes delegate as a name rule', () => {
		const after = applyAccessChanges([], [{ type: SLACK, access: 'delegate' }], nodeResolvers());

		expect(accessOf(after, SLACK)).toBe('delegate');
	});

	describe('generated tool variants', () => {
		// The `gmailTool` rule never matches: the `gmail` rule before it matches the variant too.
		const withDeadVariantRule = [
			rule('deny-gmail', 'deny', { kind: 'name', value: GMAIL }),
			rule('allow-gmail-tool', 'allow', { kind: 'name', value: GMAIL_TOOL }),
			rule('deny-base', 'deny', { kind: 'package', value: 'n8n-nodes-base' }),
		];

		it.each<TypeAccessChange['access']>(['allow', 'deny', 'inherit'])(
			'%s on the base keeps a dead variant rule dead',
			(access) => {
				const changes: TypeAccessChange[] = [{ type: GMAIL, access }];

				const after = applyAccessChanges(withDeadVariantRule, changes, nodeResolvers());

				if (access !== 'inherit') expect(accessOf(after, GMAIL)).toBe(access);
				expect(accessOf(after, GMAIL_TOOL)).toBe(accessOf(after, GMAIL));
				expectOnlyChangedTypesMoved(withDeadVariantRule, after, changes, [CODE]);
			},
		);

		it('a variant that follows its base follows the new base rule', () => {
			const after = applyAccessChanges([], [{ type: GMAIL, access: 'deny' }], nodeResolvers());

			expect(accessOf(after, GMAIL_TOOL)).toBe('deny');
		});

		it('a variant with its own deciding rule keeps it when the base changes', () => {
			const before = [
				rule('allow-gmail-tool', 'allow', { kind: 'name', value: GMAIL_TOOL }),
				rule('deny-base', 'deny', { kind: 'package', value: 'n8n-nodes-base' }),
			];
			const changes: TypeAccessChange[] = [{ type: GMAIL, access: 'deny' }];

			const after = applyAccessChanges(before, changes, nodeResolvers());

			expect(accessOf(after, GMAIL_TOOL)).toBe('allow');
			expect(accessOf(after, GMAIL)).toBe('deny');
		});

		it.each([
			[
				[
					{ type: GMAIL, access: 'deny' },
					{ type: GMAIL_TOOL, access: 'allow' },
				],
			],
			[
				[
					{ type: GMAIL_TOOL, access: 'allow' },
					{ type: GMAIL, access: 'deny' },
				],
			],
		] satisfies Array<[TypeAccessChange[]]>)(
			'base and variant in one call work in either order (%j)',
			(changes) => {
				const after = applyAccessChanges(withDeadVariantRule, changes, nodeResolvers());

				expect(accessOf(after, GMAIL)).toBe('deny');
				expect(accessOf(after, GMAIL_TOOL)).toBe('allow');
				expectOnlyChangedTypesMoved(withDeadVariantRule, after, changes, [CODE]);
			},
		);
	});

	it('never creates a shadowed rule and never moves an unchanged type', () => {
		const before = [
			rule('allow-slack', 'allow', { kind: 'name', value: SLACK }),
			rule('deny-community', 'deny', { kind: 'package', value: 'n8n-nodes-community' }),
			rule('deny-gmail', 'deny', { kind: 'name', value: GMAIL }),
			rule('deny-base', 'deny', { kind: 'package', value: 'n8n-nodes-base' }),
			rule('allow-notion', 'allow', { kind: 'name', value: NOTION }),
		];
		const changes: TypeAccessChange[] = [
			{ type: COMMUNITY, access: 'allow' },
			{ type: CODE, access: 'allow' },
			{ type: SLACK, access: 'inherit' },
			{ type: NOTION, access: 'deny' },
		];

		const after = applyAccessChanges(before, changes, nodeResolvers());

		expect(accessOf(after, COMMUNITY)).toBe('allow');
		expect(accessOf(after, CODE)).toBe('allow');
		expect(accessOf(after, SLACK)).toBe('deny');
		expect(accessOf(after, NOTION)).toBe('deny');
		expectOnlyChangedTypesMoved(before, after, changes, [GMAIL_TOOL, 'n8n-nodes-community.other']);

		const createdIds = new Set(after.map((r) => r.id).filter((id) => id.startsWith('new-')));
		const shadowedCreated = lintRulesForShadowing(
			after,
			nodeTypePackageResolver,
			nodePolicedType,
		).filter((warning) => createdIds.has(warning.ruleId));
		expect(shadowedCreated).toEqual([]);
	});
});
