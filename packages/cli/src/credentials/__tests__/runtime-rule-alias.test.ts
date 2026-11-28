import { RuntimeCredentialProxyService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { addRuntimeRuleAlias } from '../runtime-rule-alias';

describe('addRuntimeRuleAlias', () => {
	const proxy = mock<RuntimeCredentialProxyService>();

	beforeEach(() => {
		Container.set(RuntimeCredentialProxyService, proxy);
	});

	it('adds the alias of the rule behind a stub', () => {
		proxy.getRuleAliasForStub.mockReturnValue('gmail_token');

		expect(addRuntimeRuleAlias({ id: 'runtime-1', isRuntime: true })).toEqual({
			id: 'runtime-1',
			isRuntime: true,
			ruleAlias: 'gmail_token',
		});
	});

	it('adds null when the rule is gone', () => {
		proxy.getRuleAliasForStub.mockReturnValue(undefined);

		expect(addRuntimeRuleAlias({ id: 'runtime-1', isRuntime: true })).toMatchObject({
			ruleAlias: null,
		});
	});

	it('leaves other credentials unchanged', () => {
		const credential = { id: 'c1', isRuntime: false };

		expect(addRuntimeRuleAlias(credential)).toBe(credential);
	});
});
