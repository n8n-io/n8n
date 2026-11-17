import { describe, it, expect } from 'vitest';

import { setCredentialTypeAccess } from './setCredentialTypeAccess';
import type { InstancePolicyContent } from '../type-availability-policies.api';

const extendsOAuth2 = {
	id: 'extends-oauth2',
	action: 'deny' as const,
	selector: { kind: 'extends' as const, value: 'oAuth2Api' },
};

const policy = (
	rules: InstancePolicyContent<'credential'>['rules'],
): InstancePolicyContent<'credential'> => ({ rules, defaultAction: 'allow' });

describe('setCredentialTypeAccess', () => {
	it('puts a rule for the type before the broader rules', () => {
		const result = setCredentialTypeAccess(policy([extendsOAuth2]), 'gmailOAuth2', 'allow');

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

		const result = setCredentialTypeAccess(policy([extendsOAuth2, existing]), 'bitlyApi', 'deny');

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

		const result = setCredentialTypeAccess(policy([other, extendsBitly]), 'bitlyApi', 'allow');

		expect(result.rules.slice(1)).toEqual([other, extendsBitly]);
	});

	it('gives the new rule an id that no existing rule has', () => {
		const result = setCredentialTypeAccess(policy([extendsOAuth2]), 'bitlyApi', 'deny');

		expect(result.rules[0].id).not.toBe(extendsOAuth2.id);
		expect(result.rules[0].id).not.toBe('');
	});
});
