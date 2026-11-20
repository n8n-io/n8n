import type { PolicyRule } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { visibleNodeTypes } from './visibleNodeTypes';

const SUMMARIES = new Map([
	['shown', { hidden: false }],
	['hidden', { hidden: true }],
]);

describe('visibleNodeTypes', () => {
	it('keeps a type that is not hidden, and a type with no summary', () => {
		const types = [
			{ name: 'shown', matchedRuleId: null },
			{ name: 'unknown', matchedRuleId: null },
		];

		expect(visibleNodeTypes(types, SUMMARIES, [])).toEqual(types);
	});

	it('leaves out a hidden type that the default action decides', () => {
		expect(visibleNodeTypes([{ name: 'hidden', matchedRuleId: null }], SUMMARIES, [])).toEqual([]);
	});

	it('keeps a hidden type that a name rule decides', () => {
		const types = [{ name: 'hidden', matchedRuleId: 'rule-1' }];
		const rules: Array<Pick<PolicyRule, 'id' | 'selector'>> = [
			{ id: 'rule-1', selector: { kind: 'name', value: 'hidden' } },
		];

		expect(visibleNodeTypes(types, SUMMARIES, rules)).toEqual(types);
	});

	it('leaves out a hidden type that a broader rule decides', () => {
		const types = [{ name: 'hidden', matchedRuleId: 'rule-1' }];
		const rules: Array<Pick<PolicyRule, 'id' | 'selector'>> = [
			{ id: 'rule-1', selector: { kind: 'package', value: 'n8n-nodes-base' } },
		];

		expect(visibleNodeTypes(types, SUMMARIES, rules)).toEqual([]);
	});
});
