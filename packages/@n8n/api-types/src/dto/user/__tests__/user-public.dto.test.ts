import { UserPublicDto } from '../user-public.dto';

describe('UserPublicDto', () => {
	const baseUser = {
		id: 'user-id',
		email: 'member@example.com',
		firstName: null,
		lastName: null,
		isPending: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-02T00:00:00.000Z',
		mfaEnabled: false,
	};

	// A shell user (invited, not yet accepted) has no name yet.
	test('allows a null firstName and lastName', () => {
		const result = UserPublicDto.safeParse(baseUser);

		expect(result.success).toBe(true);
	});

	test('role is absent unless the caller asks for it', () => {
		const result = UserPublicDto.safeParse(baseUser);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('role');
		}
	});

	test('accepts a role when included', () => {
		const result = UserPublicDto.safeParse({ ...baseUser, role: 'global:owner' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBe('global:owner');
		}
	});
});
