import { PushWorkFolderRequestDto } from '../push-work-folder-request.dto';

describe('PushWorkFolderRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'complete valid push request with all fields',
				request: {
					force: true,
					fileNames: [
						{
							file: 'file1.json',
							id: '1',
							name: 'File 1',
							type: 'workflow',
							status: 'modified',
							location: 'local',
							conflict: false,
							updatedAt: '2023-10-01T12:00:00Z',
							pushed: true,
						},
					],
					message: 'Initial commit',
				},
			},
			{
				name: 'push request with only required fields',
				request: {
					fileNames: [
						{
							file: 'file2.json',
							id: '2',
							name: 'File 2',
							type: 'credential',
							status: 'new',
							location: 'remote',
							conflict: true,
							updatedAt: '2023-10-02T12:00:00Z',
						},
					],
				},
			},
		])('should validate $name', ({ request }) => {
			const result = PushWorkFolderRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing required fileNames field',
				request: {
					force: true,
					message: 'Initial commit',
				},
				expectedErrorPath: ['fileNames'],
			},
			{
				name: 'invalid fileNames type',
				request: {
					fileNames: 'not-an-array', // Should be an array
				},
				expectedErrorPath: ['fileNames'],
			},
			{
				name: 'invalid fileNames array element',
				request: {
					fileNames: [
						{
							file: 'file4.json',
							id: '4',
							name: 'File 4',
							type: 'invalid-type', // Invalid type
							status: 'modified',
							location: 'local',
							conflict: false,
							updatedAt: '2023-10-04T12:00:00Z',
						},
					],
				},
				expectedErrorPath: ['fileNames', 0, 'type'],
			},
			{
				name: 'invalid force type',
				request: {
					force: 'true', // Should be boolean
					fileNames: [
						{
							file: 'file5.json',
							id: '5',
							name: 'File 5',
							type: 'workflow',
							status: 'modified',
							location: 'local',
							conflict: false,
							updatedAt: '2023-10-05T12:00:00Z',
						},
					],
				},
				expectedErrorPath: ['force'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = PushWorkFolderRequestDto.safeParse(request);
			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
