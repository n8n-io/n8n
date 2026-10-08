import { CreateUsersPublicDto, InvitedUsersPublicDto } from '../create-users-public.dto';

describe('CreateUsersPublicDto', () => {
	test('accepts a list of email/role pairs', () => {
		const result = CreateUsersPublicDto.safeParse([
			{ email: 'user@example.com', role: 'global:admin' },
		]);

		expect(result.success).toBe(true);
	});

	test('defaults role to global:member', () => {
		const result = CreateUsersPublicDto.safeParse([{ email: 'user@example.com' }]);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data[0].role).toBe('global:member');
		}
	});

	test('rejects an invalid email', () => {
		const result = CreateUsersPublicDto.safeParse([{ email: 'not-an-email' }]);

		expect(result.success).toBe(false);
	});

	test('rejects the owner role', () => {
		const result = CreateUsersPublicDto.safeParse([
			{ email: 'user@example.com', role: 'global:owner' },
		]);

		expect(result.success).toBe(false);
	});

	test('rejects an empty role', () => {
		const result = CreateUsersPublicDto.safeParse([{ email: 'user@example.com', role: '' }]);

		expect(result.success).toBe(false);
	});

	test('accepts a custom role', () => {
		const result = CreateUsersPublicDto.safeParse([
			{ email: 'user@example.com', role: 'custom:role' },
		]);

		expect(result.success).toBe(true);
	});
});

describe('InvitedUsersPublicDto', () => {
	test('accepts an array of invite results', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					id: 'user-id',
					email: 'user@example.com',
					emailSent: true,
					role: 'global:member',
				},
				error: '',
			},
		]);

		expect(result.success).toBe(true);
	});

	test('accepts an optional inviteAcceptUrl', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					id: 'user-id',
					email: 'user@example.com',
					inviteAcceptUrl: 'https://n8n.example.com/signup?token=abc',
					emailSent: false,
					role: 'global:member',
				},
				error: '',
			},
		]);

		expect(result.success).toBe(true);
	});

	test('accepts an optional error field', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					id: 'user-id',
					email: 'user@example.com',
					emailSent: true,
					role: 'global:member',
				},
			},
		]);

		expect(result.success).toBe(true);
	});

	test('rejects a missing id', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					email: 'user@example.com',
					emailSent: true,
					role: 'global:member',
				},
				error: '',
			},
		]);

		expect(result.success).toBe(false);
	});

	test('rejects a missing emailSent', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					id: 'user-id',
					email: 'user@example.com',
					role: 'global:member',
				},
				error: '',
			},
		]);

		expect(result.success).toBe(false);
	});

	test('rejects a missing role', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					id: 'user-id',
					email: 'user@example.com',
					emailSent: true,
				},
				error: '',
			},
		]);

		expect(result.success).toBe(false);
	});

	test('rejects an invalid email', () => {
		const result = InvitedUsersPublicDto.safeParse([
			{
				user: {
					id: 'user-id',
					email: 'not-an-email',
					emailSent: true,
					role: 'global:member',
				},
				error: '',
			},
		]);

		expect(result.success).toBe(false);
	});
});
