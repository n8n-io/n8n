import { mock } from 'vitest-mock-extended';

import { type RoleMappingProvider, RoleMappingProxyService } from '../role-mapping-proxy.service';

describe('RoleMappingProxyService', () => {
	it('has no provider until one registers', () => {
		expect(new RoleMappingProxyService().getProvider()).toBeNull();
	});

	it('returns the registered provider', () => {
		const proxy = new RoleMappingProxyService();
		const provider = mock<RoleMappingProvider>();

		proxy.registerProvider(provider);

		expect(proxy.getProvider()).toBe(provider);
	});
});
