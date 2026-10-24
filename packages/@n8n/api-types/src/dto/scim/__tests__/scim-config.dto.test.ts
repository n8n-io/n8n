import { ScimConfigPatchDto } from '../scim-config.dto';

describe('ScimConfigPatchDto', () => {
	it.each([
		['enabled', { enabled: false }],
		['onDelete', { onDelete: 'delete' }],
		['dataAction', { dataAction: 'transfer' }],
		['a transfer project', { transferProjectId: 'project-1' }],
		['a cleared transfer project', { transferProjectId: null }],
		[
			'every field',
			{ enabled: true, onDelete: 'disable', dataAction: 'delete', transferProjectId: 'project-1' },
		],
	])('accepts a body with %s only', (_, body) => {
		const result = ScimConfigPatchDto.safeParse(body);

		expect(result.success).toBe(true);
		expect(result.data).toEqual(body);
	});

	it.each([
		['no fields', {}],
		['only unknown fields', { unknown: true }],
		['an unknown onDelete', { onDelete: 'archive' }],
		['an unknown dataAction', { dataAction: 'keep' }],
		['an empty transfer project', { transferProjectId: '' }],
	])('rejects a body with %s', (_, body) => {
		expect(ScimConfigPatchDto.safeParse(body).success).toBe(false);
	});
});
