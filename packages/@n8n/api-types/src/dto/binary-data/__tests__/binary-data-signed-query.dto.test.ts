import { BinaryDataSignedQueryDto } from '../binary-data-signed-query.dto';

describe('BinaryDataSignedQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid JWT token',
				request: {
					token:
						'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = BinaryDataSignedQueryDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing token',
				request: {},
				expectedErrorPath: ['token'],
			},
			{
				name: 'empty token',
				request: {
					token: '',
				},
				expectedErrorPath: ['token'],
			},
			{
				name: 'non-string token',
				request: {
					token: 123,
				},
				expectedErrorPath: ['token'],
			},
			{
				name: 'token without three segments',
				request: {
					token: 'header.payload',
				},
				expectedErrorPath: ['token'],
			},
			{
				name: 'token with invalid characters',
				request: {
					token: 'header.payload.sign@ture',
				},
				expectedErrorPath: ['token'],
			},
			{
				name: 'token with too many segments',
				request: {
					token: 'header.payload.signature.extra',
				},
				expectedErrorPath: ['token'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = BinaryDataSignedQueryDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
