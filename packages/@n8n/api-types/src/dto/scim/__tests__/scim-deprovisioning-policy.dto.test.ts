import { ScimDeprovisioningPolicyDto } from '../scim-deprovisioning-policy.dto';

describe('ScimDeprovisioningPolicyDto', () => {
	it.each([
		[
			'a transfer project',
			{ onDelete: 'delete', dataAction: 'transfer', transferProjectId: 'p-1' },
		],
		['no transfer project', { onDelete: 'disable', dataAction: 'delete', transferProjectId: null }],
	])('accepts a policy with %s', (_, body) => {
		expect(ScimDeprovisioningPolicyDto.safeParse(body).data).toEqual(body);
	});

	it.each([
		['a missing field', { onDelete: 'delete', dataAction: 'transfer' }],
		[
			'an unknown onDelete',
			{ onDelete: 'archive', dataAction: 'transfer', transferProjectId: null },
		],
		['an unknown dataAction', { onDelete: 'delete', dataAction: 'keep', transferProjectId: null }],
		[
			'an empty transfer project',
			{ onDelete: 'delete', dataAction: 'transfer', transferProjectId: '' },
		],
	])('rejects a policy with %s', (_, body) => {
		expect(ScimDeprovisioningPolicyDto.safeParse(body).success).toBe(false);
	});
});
