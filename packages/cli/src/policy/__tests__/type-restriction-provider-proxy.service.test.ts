import { mock } from 'vitest-mock-extended';

import {
	TypeRestrictionProviderProxy,
	type TypeRestrictionProvider,
} from '../type-restriction-provider-proxy.service';

describe('TypeRestrictionProviderProxy', () => {
	it('reports nothing restricted while no provider is registered', async () => {
		const proxy = new TypeRestrictionProviderProxy();

		await expect(proxy.findRestrictedTypes('node', 'p1', ['a'])).resolves.toEqual(new Map());
	});

	it('asks the registered provider', async () => {
		const provider = mock<TypeRestrictionProvider>();
		const restricted = new Map([['a', { scope: 'project' as const }]]);
		provider.findRestrictedTypes.mockResolvedValue(restricted);
		const proxy = new TypeRestrictionProviderProxy();
		proxy.registerProvider(provider);

		await expect(proxy.findRestrictedTypes('credential', 'p1', ['a'])).resolves.toBe(restricted);
		expect(provider.findRestrictedTypes).toHaveBeenCalledWith('credential', 'p1', ['a']);
	});

	it('skips the provider when there are no types to check', async () => {
		const provider = mock<TypeRestrictionProvider>();
		const proxy = new TypeRestrictionProviderProxy();
		proxy.registerProvider(provider);

		await expect(proxy.findRestrictedTypes('node', 'p1', [])).resolves.toEqual(new Map());
		expect(provider.findRestrictedTypes).not.toHaveBeenCalled();
	});
});
