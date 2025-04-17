import { CommunityRegisteredRequestDto } from '../community-registered-request.dto';

describe('CommunityRegisteredRequestDto', () => {
	it('should fail validation for missing email', () => {
		const invalidRequest = {};

		const result = CommunityRegisteredRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toEqual(
			expect.objectContaining({ message: 'Required', path: ['email'] }),
		);
	});

	it('should fail validation for an invalid email', () => {
		const invalidRequest = {
			email: 'invalid-email',
		};

		const result = CommunityRegisteredRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toEqual(
			expect.objectContaining({ message: 'Invalid email', path: ['email'] }),
		);
	});
});
