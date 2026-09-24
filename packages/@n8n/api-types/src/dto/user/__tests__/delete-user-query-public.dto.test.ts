import { DeleteUserQueryPublicDto } from '../delete-user-query-public.dto';

describe('DeleteUserQueryPublicDto', () => {
	test('allows an empty query', () => {
		const result = DeleteUserQueryPublicDto.safeParse({});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.transferId).toBeUndefined();
		}
	});

	test('accepts a transferId', () => {
		const result = DeleteUserQueryPublicDto.safeParse({ transferId: 'project-1' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.transferId).toBe('project-1');
		}
	});
});
