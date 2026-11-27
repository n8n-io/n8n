import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useRuntimeRuleLink } from './useRuntimeRuleLink';

describe('useRuntimeRuleLink', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('links to the rule by its alias', () => {
		expect(useRuntimeRuleLink().ruleLocation('gmail-caller')).toEqual({
			path: '/settings/runtime-inputs',
			query: { rule: 'gmail-caller' },
		});
	});

	it.each([undefined, null, ''])('links to the page without a rule for %j', (alias) => {
		expect(useRuntimeRuleLink().ruleLocation(alias)).toEqual({ path: '/settings/runtime-inputs' });
	});
});
