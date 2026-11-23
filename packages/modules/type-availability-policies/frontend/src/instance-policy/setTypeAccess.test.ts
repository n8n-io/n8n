import { describe, it, expect } from 'vitest';

import { setTypeAccess } from './setTypeAccess';
import type { InstancePolicyContent } from '../type-availability-policies.api';

const extendsOAuth2 = {
	id: 'extends-oauth2',
	action: 'deny' as const,
	selector: { kind: 'extends' as const, value: 'oAuth2Api' },
};

const policy = (
	rules: InstancePolicyContent<'credential'>['rules'],
): InstancePolicyContent<'credential'> => ({ rules, defaultAction: 'allow' });

describe('setTypeAccess', () => {
	it('puts a rule for the type before the broader rules', () => {
		const result = setTypeAccess(policy([extendsOAuth2]), 'gmailOAuth2', 'allow');

		expect(result.rules).toEqual([
			{ id: expect.any(String), action: 'allow', selector: { kind: 'name', value: 'gmailOAuth2' } },
			extendsOAuth2,
		]);
		expect(result.defaultAction).toBe('allow');
	});

	it('replaces the existing rule that names the type', () => {
		const existing = {
			id: 'bitly',
			action: 'allow' as const,
			selector: { kind: 'name' as const, value: 'bitlyApi' },
		};

		const result = setTypeAccess(policy([extendsOAuth2, existing]), 'bitlyApi', 'deny');

		expect(result.rules).toEqual([
			{ id: expect.any(String), action: 'deny', selector: { kind: 'name', value: 'bitlyApi' } },
			extendsOAuth2,
		]);
	});

	it('keeps rules that name other types, and an extends rule with the same value', () => {
		const other = {
			id: 'notion',
			action: 'deny' as const,
			selector: { kind: 'name' as const, value: 'notionApi' },
		};
		const extendsBitly = {
			id: 'extends-bitly',
			action: 'deny' as const,
			selector: { kind: 'extends' as const, value: 'bitlyApi' },
		};

		const result = setTypeAccess(policy([other, extendsBitly]), 'bitlyApi', 'allow');

		expect(result.rules.slice(1)).toEqual([other, extendsBitly]);
	});

	it('gives the new rule an id that no existing rule has', () => {
		const result = setTypeAccess(policy([extendsOAuth2]), 'bitlyApi', 'deny');

		expect(result.rules[0].id).not.toBe(extendsOAuth2.id);
		expect(result.rules[0].id).not.toBe('');
	});

	it('keeps the rule of a node type trigger when it sets the node type', () => {
		const trigger = {
			id: 'trigger',
			action: 'allow' as const,
			selector: { kind: 'name' as const, value: 'n8n-nodes-base.slackTrigger' },
		};
		const nodePolicy: InstancePolicyContent<'node'> = { rules: [trigger], defaultAction: 'allow' };

		const result = setTypeAccess(nodePolicy, 'n8n-nodes-base.slack', 'deny');

		expect(result.rules).toEqual([
			{
				id: expect.any(String),
				action: 'deny',
				selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
			},
			trigger,
		]);
	});

	describe('with the rule that decides the type now', () => {
		const SLACK = 'n8n-nodes-base.slack';
		const denySlackTool = {
			id: 'deny-slack-tool',
			action: 'deny' as const,
			selector: { kind: 'name' as const, value: `${SLACK}Tool` },
		};
		const denyBasePackage = {
			id: 'deny-base',
			action: 'deny' as const,
			selector: { kind: 'package' as const, value: 'n8n-nodes-base' },
		};
		const nodePolicy = (
			rules: InstancePolicyContent<'node'>['rules'],
		): InstancePolicyContent<'node'> => ({ rules, defaultAction: 'allow' });
		const slackRule = (action: 'allow' | 'deny') => ({
			id: expect.any(String),
			action,
			selector: { kind: 'name', value: SLACK },
		});

		it('puts the rule before the deciding rule, so an earlier Tool variant rule keeps deciding', () => {
			const result = setTypeAccess(
				nodePolicy([denySlackTool, denyBasePackage]),
				SLACK,
				'allow',
				denyBasePackage.id,
			);

			expect(result.rules).toEqual([denySlackTool, slackRule('allow'), denyBasePackage]);
		});

		it('puts the rule where the earlier rule of the type was', () => {
			const own = {
				id: 'own',
				action: 'allow' as const,
				selector: { kind: 'name' as const, value: SLACK },
			};

			const result = setTypeAccess(
				nodePolicy([denySlackTool, own, denyBasePackage]),
				SLACK,
				'deny',
				own.id,
			);

			expect(result.rules).toEqual([denySlackTool, slackRule('deny'), denyBasePackage]);
		});

		it('puts the rule last when the default action decides the type', () => {
			const result = setTypeAccess(nodePolicy([denySlackTool]), SLACK, 'deny', null);

			expect(result.rules).toEqual([denySlackTool, slackRule('deny')]);
		});

		it('puts the rule first when the deciding rule is not in the list', () => {
			const result = setTypeAccess(nodePolicy([denySlackTool]), SLACK, 'deny', 'gone');

			expect(result.rules).toEqual([slackRule('deny'), denySlackTool]);
		});
	});
});
