import {
	credentialTypePolicyRuleSchemas,
	nodeTypePolicyRuleSchemas,
	nonDelegatingPolicyActionSchema,
	policyActionSchema,
} from '../policy-rule.schema';

const {
	rule: policyRuleSchema,
	ruleList: policyRuleListSchema,
	nonDelegatingRuleList: nonDelegatingPolicyRuleListSchema,
} = nodeTypePolicyRuleSchemas;

const nameSelector = { kind: 'name' as const, value: 'n8n-nodes-base.slack' };

describe('policyActionSchema', () => {
	it.each(['allow', 'deny', 'delegate'])('accepts %s', (action) => {
		expect(policyActionSchema.safeParse(action).success).toBe(true);
	});

	it('rejects an unknown action', () => {
		expect(policyActionSchema.safeParse('block').success).toBe(false);
	});
});

describe('policyRuleSchema', () => {
	it('accepts a valid rule', () => {
		expect(
			policyRuleSchema.safeParse({ id: 'r1', action: 'deny', selector: nameSelector }).success,
		).toBe(true);
	});

	it('rejects an empty id', () => {
		expect(
			policyRuleSchema.safeParse({ id: '', action: 'deny', selector: nameSelector }).success,
		).toBe(false);
	});

	it('rejects an invalid selector', () => {
		expect(
			policyRuleSchema.safeParse({ id: 'r1', action: 'deny', selector: { kind: 'name' } }).success,
		).toBe(false);
	});
});

describe('policyRuleListSchema', () => {
	it('accepts an empty list', () => {
		expect(policyRuleListSchema.safeParse([]).success).toBe(true);
	});

	it('accepts a list of rules with unique ids', () => {
		expect(
			policyRuleListSchema.safeParse([
				{ id: 'r1', action: 'deny', selector: nameSelector },
				{ id: 'r2', action: 'allow', selector: { kind: 'package', value: 'n8n-nodes-base' } },
			]).success,
		).toBe(true);
	});

	it('rejects duplicate rule ids', () => {
		const result = policyRuleListSchema.safeParse([
			{ id: 'r1', action: 'deny', selector: nameSelector },
			{ id: 'r1', action: 'allow', selector: { kind: 'package', value: 'n8n-nodes-base' } },
		]);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Duplicate rule id: r1');
		}
	});
});

describe('nonDelegatingPolicyActionSchema', () => {
	it.each(['allow', 'deny'])('accepts %s', (action) => {
		expect(nonDelegatingPolicyActionSchema.safeParse(action).success).toBe(true);
	});

	it('rejects delegate', () => {
		expect(nonDelegatingPolicyActionSchema.safeParse('delegate').success).toBe(false);
	});
});

describe('nonDelegatingPolicyRuleListSchema', () => {
	it('accepts a list of allow/deny rules with unique ids', () => {
		expect(
			nonDelegatingPolicyRuleListSchema.safeParse([
				{ id: 'r1', action: 'deny', selector: nameSelector },
				{ id: 'r2', action: 'allow', selector: { kind: 'package', value: 'n8n-nodes-base' } },
			]).success,
		).toBe(true);
	});

	it('rejects a rule using the delegate action', () => {
		expect(
			nonDelegatingPolicyRuleListSchema.safeParse([
				{ id: 'r1', action: 'delegate', selector: nameSelector },
			]).success,
		).toBe(false);
	});

	it('still rejects duplicate rule ids', () => {
		const result = nonDelegatingPolicyRuleListSchema.safeParse([
			{ id: 'r1', action: 'deny', selector: nameSelector },
			{ id: 'r1', action: 'allow', selector: { kind: 'package', value: 'n8n-nodes-base' } },
		]);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Duplicate rule id: r1');
		}
	});
});

describe('rule schemas per kind', () => {
	const extendsRule = {
		id: 'r1',
		action: 'deny',
		selector: { kind: 'extends', value: 'oAuth2Api' },
	};

	it('rejects an extends rule in a node type policy', () => {
		expect(nodeTypePolicyRuleSchemas.ruleList.safeParse([extendsRule]).success).toBe(false);
		expect(nodeTypePolicyRuleSchemas.nonDelegatingRuleList.safeParse([extendsRule]).success).toBe(
			false,
		);
	});

	it('accepts an extends rule in a credential type policy', () => {
		expect(credentialTypePolicyRuleSchemas.ruleList.safeParse([extendsRule]).success).toBe(true);
		expect(
			credentialTypePolicyRuleSchemas.nonDelegatingRuleList.safeParse([extendsRule]).success,
		).toBe(true);
	});

	it('rejects duplicate rule ids in a credential type policy', () => {
		expect(
			credentialTypePolicyRuleSchemas.ruleList.safeParse([extendsRule, extendsRule]).success,
		).toBe(false);
	});
});
