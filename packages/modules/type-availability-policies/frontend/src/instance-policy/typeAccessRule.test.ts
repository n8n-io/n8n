import { describe, expect, it } from 'vitest';

import { isTypeAccessEditable } from './typeAccessRule';

describe('isTypeAccessEditable', () => {
	it.each([
		{ access: 'allow', matchedRuleId: 'rule', editable: true },
		{ access: 'deny', matchedRuleId: 'rule', editable: true },
		{ access: 'delegate', matchedRuleId: null, editable: true },
		{ access: 'delegate', matchedRuleId: 'rule', editable: false },
	] as const)(
		'is $editable for $access access decided by rule $matchedRuleId',
		({ access, matchedRuleId, editable }) => {
			expect(isTypeAccessEditable({ name: 'n8n-nodes-base.slack', access, matchedRuleId })).toBe(
				editable,
			);
		},
	);
});
