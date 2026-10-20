import { SCIM_N8N_USER_SCHEMA } from '../../../constants/scim';
import { ScimUserCreateDto } from '../scim-user-create.dto';

describe('ScimUserCreateDto', () => {
	const base = {
		schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
		userName: 'ada@example.com',
	};

	it('accepts the core roles attribute', () => {
		const result = ScimUserCreateDto.safeParse({
			...base,
			roles: [{ value: 'global:admin', primary: true, display: 'Admin' }],
		});

		expect(result.success).toBe(true);
		expect(result.data?.roles).toEqual([
			{ value: 'global:admin', primary: true, display: 'Admin' },
		]);
	});

	it('accepts the n8n extension', () => {
		const result = ScimUserCreateDto.safeParse({
			...base,
			schemas: [...base.schemas, SCIM_N8N_USER_SCHEMA],
			[SCIM_N8N_USER_SCHEMA]: { instanceRole: 'global:admin' },
		});

		expect(result.success).toBe(true);
		expect(result.data?.[SCIM_N8N_USER_SCHEMA]).toEqual({ instanceRole: 'global:admin' });
	});

	it('rejects a roles entry without a value', () => {
		expect(ScimUserCreateDto.safeParse({ ...base, roles: [{ primary: true }] }).success).toBe(
			false,
		);
	});

	it('drops attributes it does not know, such as the password Okta sends', () => {
		const result = ScimUserCreateDto.safeParse({ ...base, password: 'placeholder' });

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('password');
	});
});
