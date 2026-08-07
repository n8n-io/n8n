import { TransferWorkflowPublicDto } from '../transfer-workflow-public.dto';

describe('TransferWorkflowPublicDto', () => {
	describe('Valid requests', () => {
		test('accepts destinationProjectId', () => {
			const result = TransferWorkflowPublicDto.safeParse({ destinationProjectId: '1234' });
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'no destinationProjectId',
				input: {},
				expectedErrorPath: ['destinationProjectId'],
			},
			{
				name: 'destinationProjectId not being a string',
				input: { destinationProjectId: 1234 },
				expectedErrorPath: ['destinationProjectId'],
			},
		])('should fail validation for $name', ({ input, expectedErrorPath }) => {
			const result = TransferWorkflowPublicDto.safeParse(input);

			expect(result.success).toBe(false);
			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});

		test('strips fields not part of the public contract', () => {
			const result = TransferWorkflowPublicDto.safeParse({
				destinationProjectId: '1234',
				shareCredentials: ['cred-1'],
				destinationParentFolderId: 'folder-1',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty('shareCredentials');
				expect(result.data).not.toHaveProperty('destinationParentFolderId');
			}
		});
	});
});
