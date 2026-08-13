import type { AgentGoalConfig } from '@n8n/api-types';

import { deriveGoalStatuses, diffGoalStatuses } from '../derive-status';
import type { SlotValues } from '../types';

const verifyCustomer: AgentGoalConfig = {
	id: 'verify_customer',
	name: 'Verify the customer',
	instructions: 'Verify',
	achievedWhen: '={{ $state.customerSalesforceId !== null }}',
	failedWhen: '={{ $state.verificationAttempts >= 3 }}',
};

const extendTrial: AgentGoalConfig = {
	id: 'extend_trial',
	name: 'Extend the trial',
	instructions: 'Extend',
	requires: ['verify_customer'],
	achievedWhen: '={{ $state.trialExtendedUntil !== null }}',
};

const goals = [verifyCustomer, extendTrial];

function state(values: SlotValues): SlotValues {
	return {
		customerSalesforceId: null,
		verificationAttempts: 0,
		trialExtendedUntil: null,
		...values,
	};
}

describe('deriveGoalStatuses', () => {
	it('starts with the root goal active and dependent goals locked', () => {
		expect(deriveGoalStatuses(goals, state({}))).toEqual({
			verify_customer: 'active',
			extend_trial: 'locked',
		});
	});

	it('unlocks dependents when prerequisites are achieved', () => {
		expect(deriveGoalStatuses(goals, state({ customerSalesforceId: 'SF-1' }))).toEqual({
			verify_customer: 'achieved',
			extend_trial: 'active',
		});
	});

	it('derives failed from failedWhen', () => {
		expect(deriveGoalStatuses(goals, state({ verificationAttempts: 3 }))).toEqual({
			verify_customer: 'failed',
			extend_trial: 'locked',
		});
	});

	it('lets achieved take precedence over failed (third attempt succeeds)', () => {
		expect(
			deriveGoalStatuses(goals, state({ customerSalesforceId: 'SF-1', verificationAttempts: 3 })),
		).toEqual({
			verify_customer: 'achieved',
			extend_trial: 'active',
		});
	});

	it('regresses automatically when a slot is cleared', () => {
		const achieved = deriveGoalStatuses(goals, state({ customerSalesforceId: 'SF-1' }));
		expect(achieved.extend_trial).toBe('active');

		const regressed = deriveGoalStatuses(goals, state({ customerSalesforceId: null }));
		expect(regressed).toEqual({ verify_customer: 'active', extend_trial: 'locked' });
	});

	it('respects the unlockedWhen escape hatch on top of requires', () => {
		const gated: AgentGoalConfig = {
			...extendTrial,
			unlockedWhen: '={{ $state.verificationAttempts === 0 }}',
		};
		const achievedState = state({ customerSalesforceId: 'SF-1', verificationAttempts: 1 });
		expect(deriveGoalStatuses([verifyCustomer, gated], achievedState).extend_trial).toBe('locked');

		const cleanState = state({ customerSalesforceId: 'SF-1', verificationAttempts: 0 });
		expect(deriveGoalStatuses([verifyCustomer, gated], cleanState).extend_trial).toBe('active');
	});

	it('treats a goal without achievedWhen as never auto-achieving', () => {
		const openEnded: AgentGoalConfig = { id: 'help', name: 'Help', instructions: 'Help' };
		expect(deriveGoalStatuses([openEnded], {})).toEqual({ help: 'active' });
	});

	it('derives "condition not met" from invalid expressions (fail-soft)', () => {
		const broken: AgentGoalConfig = {
			id: 'broken',
			name: 'Broken',
			instructions: 'x',
			achievedWhen: '={{ this is not valid javascript ]] }}',
		};
		expect(deriveGoalStatuses([broken], {})).toEqual({ broken: 'active' });
	});
});

describe('diffGoalStatuses', () => {
	it('reports only changed goals', () => {
		expect(diffGoalStatuses({ a: 'active', b: 'locked' }, { a: 'achieved', b: 'locked' })).toEqual([
			{ goalId: 'a', from: 'active', to: 'achieved' },
		]);
	});

	it('returns an empty list when nothing changed', () => {
		expect(diffGoalStatuses({ a: 'active' }, { a: 'active' })).toEqual([]);
	});
});
