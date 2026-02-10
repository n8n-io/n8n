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
			{
				name: 'with autoPublish="none"',
				request: { autoPublish: 'none' },
			},
			{
				name: 'with autoPublish="all"',
				request: { autoPublish: 'all' },
			},
			{
				name: 'with autoPublish="published"',
				request: { autoPublish: 'published' },
			},
			{
				name: 'with force and autoPublish',
				request: { force: true, autoPublish: 'all' },
			},
		])('should validate $name', ({ request }) => {
			const result = PullWorkFolderRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('should default autoPublish to "none" when not specified', () => {
			const result = PullWorkFolderRequestDto.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.autoPublish).toBe('none');
			}
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
			{
				name: 'invalid autoPublish value',
				request: {
					autoPublish: 'invalid',
				},
				expectedErrorPath: ['autoPublish'],
			},
			{
				name: 'invalid autoPublish type',
				request: {
					autoPublish: true, // Should be string
				},
				expectedErrorPath: ['autoPublish'],
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
