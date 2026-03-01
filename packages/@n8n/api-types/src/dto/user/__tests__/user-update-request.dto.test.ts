import { UserUpdateRequestDto } from '../user-update-request.dto';

describe('UserUpdateRequestDto', () => {
	it('should fail validation for an invalid email', () => {
		const invalidRequest = {
			email: 'invalid-email',
			firstName: 'John',
			lastName: 'Doe',
			mfaCode: '123456',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['email']);
	});

	it('should fail validation for a firstName with potential XSS attack', () => {
		const invalidRequest = {
			email: 'test@example.com',
			firstName: '<script>alert("XSS")</script>',
			lastName: 'Doe',
			mfaCode: '123456',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['firstName']);
	});

	it('should fail validation for a firstName with a URL', () => {
		const invalidRequest = {
			email: 'test@example.com',
			firstName: 'test http://malicious.com',
			lastName: 'Doe',
			mfaCode: '123456',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['firstName']);
	});

	it('should fail validation for a lastName with potential XSS attack', () => {
		const invalidRequest = {
			email: 'test@example.com',
			firstName: 'John',
			lastName: '<script>alert("XSS")</script>',
			mfaCode: '123456',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['lastName']);
	});

	it('should fail validation for a lastName with a URL', () => {
		const invalidRequest = {
			email: 'test@example.com',
			firstName: 'John',
			lastName: 'testing http://malicious.com',
			mfaCode: '123456',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['lastName']);
	});

	it('should validate a valid user update request', () => {
		const validRequest = {
			email: 'test@example.com',
			firstName: 'John',
			lastName: 'Doe',
			mfaCode: '123456',
		};

		const result = UserUpdateRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});
});
