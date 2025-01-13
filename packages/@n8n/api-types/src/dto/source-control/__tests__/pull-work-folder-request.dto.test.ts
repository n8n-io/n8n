import { PullWorkFolderRequestDto } from '../pull-work-folder-request.dto';

describe('PullWorkFolderRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with force',
				request: { force: true },
			},
			{
				name: 'without force',
				request: {},
			},
		])('should validate $name', ({ request }) => {
			const result = PullWorkFolderRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid force type',
				request: {
					force: 'true', // Should be boolean
				},
				expectedErrorPath: ['force'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = PullWorkFolderRequestDto.safeParse(request);
			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
