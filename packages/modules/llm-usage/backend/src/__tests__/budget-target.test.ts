import type { LlmBudgetTarget, LlmBudgetWindow } from '@n8n/api-types';
import type { LlmCallPolicyContext } from '@n8n/decorators';

import {
	applicableBudgets,
	callValues,
	counterKey,
	rowValues,
	type CallValues,
} from '../budget-target';

const day: LlmBudgetWindow = { kind: 'rolling', unit: 'day' };
const month: LlmBudgetWindow = { kind: 'rolling', unit: 'month' };

const budget = (
	name: string,
	target: LlmBudgetTarget,
	timeWindow = day,
	managedBy: string | null = null,
) => ({ name, target, timeWindow, managedBy });

const names = (budgets: Array<{ name: string }>) => budgets.map(({ name }) => name).sort();

const allUsers = budget('all users $20', { user: { match: 'all' } });
const userX = budget('user X $100', { user: { match: 'ids', ids: ['x'] } });

describe('counterKey', () => {
	const values: CallValues = { user: 'x', credential: 'cred-1' };

	it.each([
		[
			'a dimension that is not set matches any value',
			{ credential: { match: 'all' } },
			'credential=cred-1',
		],
		['all gives each value its own counter', { user: { match: 'all' } }, 'user=x'],
		['a listed ID matches', { user: { match: 'ids', ids: ['x', 'y'] } }, 'user=x'],
		['an ID that is not listed does not match', { user: { match: 'ids', ids: ['y'] } }, undefined],
		['a call without a value does not match', { agent: { match: 'all' } }, undefined],
		[
			'the key joins every set dimension',
			{ user: { match: 'all' }, credential: { match: 'all' } },
			'user=x&credential=cred-1',
		],
	] satisfies Array<[string, LlmBudgetTarget, string | undefined]>)('%s', (_name, target, key) => {
		expect(counterKey(budget('b', target), values)).toBe(key);
	});
});

describe('applicableBudgets', () => {
	it.each([
		['X gets the specific limit', [allUsers, userX], { user: 'x' }, ['user X $100']],
		['others keep the general limit', [allUsers, userX], { user: 'y' }, ['all users $20']],
		[
			'a different window is another family, so both apply',
			[allUsers, budget('user X monthly', { user: { match: 'ids', ids: ['x'] } }, month)],
			{ user: 'x' },
			['all users $20', 'user X monthly'],
		],
		[
			'different dimensions are another family, so both apply',
			[
				allUsers,
				budget('user X on cred-1', {
					user: { match: 'ids', ids: ['x'] },
					credential: { match: 'ids', ids: ['cred-1'] },
				}),
			],
			{ user: 'x', credential: 'cred-1' },
			['all users $20', 'user X on cred-1'],
		],
		[
			'two lists that both name X both apply',
			[budget('users X and Y', { user: { match: 'ids', ids: ['x', 'y'] } }), userX],
			{ user: 'x' },
			['user X $100', 'users X and Y'],
		],
	])('%s', (_name, budgets, values, expected) => {
		expect(names(applicableBudgets(budgets, values))).toEqual(expected);
	});

	it('never lets a budget of another owner overtake an admin budget', () => {
		const agentOwned = budget('agent budget', { user: { match: 'ids', ids: ['x'] } }, day, 'agent');

		expect(names(applicableBudgets([allUsers, agentOwned], { user: 'x' }))).toEqual([
			'agent budget',
			'all users $20',
		]);
	});
});

describe('callValues and rowValues', () => {
	it('give the same values for a call before it is sent and after it is recorded', () => {
		const context: LlmCallPolicyContext = {
			callerType: 'agent',
			workflowId: 'wf-1',
			agentId: 'agent-1',
			projectId: 'proj-1',
			accountableUserId: null,
			credential: { managedBy: 'aiGateway' },
			provider: 'openai',
			model: 'gpt-4o',
		};
		const row = {
			workflowId: 'wf-1',
			agentId: 'agent-1',
			projectId: 'proj-1',
			accountableUserId: 'publisher-1',
			credentialId: null,
			managedBy: 'aiGateway' as const,
		};

		expect(callValues(context, 'publisher-1')).toEqual(rowValues(row));
		expect(rowValues(row).credential).toBe('managed:aiGateway');
	});
});
