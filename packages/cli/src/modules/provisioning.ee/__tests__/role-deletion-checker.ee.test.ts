import type { ProvisioningConfigDto } from '@n8n/api-types';
import type { RoleMappingRuleRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ProvisioningRoleDeletionChecker } from '../role-deletion-checker.ee';
import type { ProvisioningService } from '../provisioning.service.ee';

describe('ProvisioningRoleDeletionChecker', () => {
	const roleMappingRuleRepository = mock<RoleMappingRuleRepository>();
	const provisioningService = mock<ProvisioningService>();
	const checker = new ProvisioningRoleDeletionChecker(
		roleMappingRuleRepository,
		provisioningService,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		roleMappingRuleRepository.count.mockResolvedValue(0);
		provisioningService.getConfig.mockResolvedValue(
			mock<ProvisioningConfigDto>({ defaultInstanceRole: undefined }),
		);
	});

	it('reports no blockers when the role is unreferenced', async () => {
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

	it('reports a blocker when the role is the default condition role', async () => {
		provisioningService.getConfig.mockResolvedValue(
			mock<ProvisioningConfigDto>({ defaultInstanceRole: 'global:auditor' }),
		);

		const blockers = await checker.findRoleDeletionBlockers('global:auditor');

		expect(blockers).toEqual(['configured as the role mapping default condition role']);
	});

	it('reports both blockers when the role is referenced by a mapping rule and is the default condition role', async () => {
		roleMappingRuleRepository.count.mockResolvedValue(1);
		provisioningService.getConfig.mockResolvedValue(
			mock<ProvisioningConfigDto>({ defaultInstanceRole: 'global:auditor' }),
		);

		const blockers = await checker.findRoleDeletionBlockers('global:auditor');

		expect(blockers).toEqual([
			'referenced by 1 role mapping rule',
			'configured as the role mapping default condition role',
		]);
	});
});
