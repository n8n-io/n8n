import { TransferWorkflowBodyDto } from '../transfer.dto';

describe('ImportWorkflowFromUrlDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'only destinationProjectId',
				input: { destinationProjectId: '1234' },
			},
			{
				name: 'destinationProjectId with empty shareCredentials',
				input: { destinationProjectId: '1234', shareCredentials: [] },
			},
			{
				name: 'destinationProjectId with shareCredentials',
				input: { destinationProjectId: '1234', shareCredentials: ['1235'] },
			},
		])('should validate $name', ({ input }) => {
			const result = TransferWorkflowBodyDto.safeParse(input);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'no destinationProjectId',
				input: { shareCredentials: [] },
				expectedErrorPath: ['destinationProjectId'],
			},
			{
				name: 'destinationProjectId not being a string',
				input: { destinationProjectId: 1234 },
				expectedErrorPath: ['destinationProjectId'],
			},
			{
				name: 'shareCredentials not being an array',
				input: { destinationProjectId: '1234', shareCredentials: '1235' },
				expectedErrorPath: ['shareCredentials'],
			},
			{
				name: 'shareCredentials not containing strings',
				input: { destinationProjectId: '1234', shareCredentials: [1235] },
				expectedErrorPath: ['shareCredentials', 0],
			},
		])('should fail validation for $name', ({ input, expectedErrorPath }) => {
			const result = TransferWorkflowBodyDto.safeParse(input);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
