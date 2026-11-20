import { UserUpdateRequestDto } from '../user-update-request.dto';

describe('UserUpdateRequestDto', () => {
	it('should fail validation for a firstName with potential XSS attack', () => {
		const invalidRequest = {
			firstName: '<script>alert("XSS")</script>',
			lastName: 'Doe',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['firstName']);
	});

	it('should fail validation for a firstName with a URL', () => {
		const invalidRequest = {
			firstName: 'test http://malicious.com',
			lastName: 'Doe',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['firstName']);
	});

	it('should fail validation for a lastName with potential XSS attack', () => {
		const invalidRequest = {
			firstName: 'John',
			lastName: '<script>alert("XSS")</script>',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['lastName']);
	});

	it('should fail validation for a lastName with a URL', () => {
		const invalidRequest = {
			firstName: 'John',
			lastName: 'testing http://malicious.com',
		};

		const result = UserUpdateRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['lastName']);
	});

	it('should validate a valid user update request', () => {
		const validRequest = {
			firstName: 'John',
			lastName: 'Doe',
		};

		const result = UserUpdateRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});

	it('should strip an email field from the request', () => {
		const requestWithEmail = {
			firstName: 'John',
			lastName: 'Doe',
			email: 'test@example.com',
		};

		const result = UserUpdateRequestDto.safeParse(requestWithEmail);

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('email');
	});
});
