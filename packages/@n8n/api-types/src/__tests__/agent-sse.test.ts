import { isAgentBudgetNoticeCode } from '../agent-sse';

describe('isAgentBudgetNoticeCode', () => {
	it.each(['budget.alert', 'budget.session', 'budget.monthly', 'budget.credits'])(
		'accepts %s',
		(code) => {
			expect(isAgentBudgetNoticeCode(code)).toBe(true);
		},
	);

	it.each(['pii.block', 'budget.misconfigured', 'budget', ''])(
		'rejects the non-notice code %s',
		(code) => {
			expect(isAgentBudgetNoticeCode(code)).toBe(false);
		},
	);
});
