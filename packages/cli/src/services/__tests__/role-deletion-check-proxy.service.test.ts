import { mock } from 'jest-mock-extended';

import {
	RoleDeletionCheckProxy,
	type RoleDeletionChecker,
} from '@/services/role-deletion-check-proxy.service';

describe('RoleDeletionCheckProxy', () => {
	it('reports no blockers when no provider is registered', async () => {
		const proxy = new RoleDeletionCheckProxy();

		await expect(proxy.findRoleDeletionBlockers('global:auditor')).resolves.toEqual([]);
	});

	it('delegates to the registered provider', async () => {
		const proxy = new RoleDeletionCheckProxy();
		const provider = mock<RoleDeletionChecker>();
		provider.findRoleDeletionBlockers.mockResolvedValue(['referenced by 2 role mapping rules']);
		proxy.registerProvider(provider);

		const blockers = await proxy.findRoleDeletionBlockers('global:auditor');

		expect(provider.findRoleDeletionBlockers).toHaveBeenCalledWith('global:auditor');
		expect(blockers).toEqual(['referenced by 2 role mapping rules']);
	});
});
