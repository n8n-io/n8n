import type { RoleMappingRuleRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ProvisioningRoleDeletionChecker } from '../role-deletion-checker.ee';

describe('ProvisioningRoleDeletionChecker', () => {
	const roleMappingRuleRepository = mock<RoleMappingRuleRepository>();
	const checker = new ProvisioningRoleDeletionChecker(roleMappingRuleRepository);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reports no blockers when no mapping rule references the role', async () => {
		roleMappingRuleRepository.count.mockResolvedValue(0);

		const blockers = await checker.findRoleDeletionBlockers('global:auditor');

		expect(roleMappingRuleRepository.count).toHaveBeenCalledWith({
			where: { role: { slug: 'global:auditor' } },
		});
		expect(blockers).toEqual([]);
	});

	it('reports a blocker (singular) when one mapping rule references the role', async () => {
		roleMappingRuleRepository.count.mockResolvedValue(1);

		const blockers = await checker.findRoleDeletionBlockers('global:auditor');

		expect(blockers).toEqual(['referenced by 1 role mapping rule']);
	});

	it('reports a blocker (plural) when several mapping rules reference the role', async () => {
		roleMappingRuleRepository.count.mockResolvedValue(3);

		const blockers = await checker.findRoleDeletionBlockers('global:auditor');

		expect(blockers).toEqual(['referenced by 3 role mapping rules']);
	});
});
