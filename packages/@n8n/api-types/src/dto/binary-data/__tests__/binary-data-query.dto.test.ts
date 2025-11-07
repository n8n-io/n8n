import { BinaryDataQueryDto } from '../binary-data-query.dto';

describe('BinaryDataQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'filesystem mode with view action',
				request: {
					id: 'filesystem:some-id',
					action: 'view',
				},
			},
			{
				name: 'filesystem-v2 mode with download action',
				request: {
					id: 'filesystem-v2:some-id',
					action: 'download',
				},
			},
			{
				name: 's3 mode with view action and optional fields',
				request: {
					id: 's3:some-id',
					action: 'view',
					fileName: 'test.pdf',
					mimeType: 'application/pdf',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = BinaryDataQueryDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing mode separator',
				request: {
					id: 'filesystemsome-id',
					action: 'view',
				},
				expectedErrorPath: ['id'],
			},
			{
				name: 'invalid mode',
				request: {
					id: 'invalid:some-id',
					action: 'view',
				},
				expectedErrorPath: ['id'],
			},
			{
				name: 'invalid action',
				request: {
					id: 'filesystem:some-id',
					action: 'invalid',
				},
				expectedErrorPath: ['action'],
			},
			{
				name: 'missing id',
				request: {
					action: 'view',
				},
				expectedErrorPath: ['id'],
			},
			{
				name: 'missing action',
				request: {
					id: 'filesystem:some-id',
				},
				expectedErrorPath: ['action'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = BinaryDataQueryDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
