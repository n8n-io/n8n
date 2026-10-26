import { TransferPreviewQueryDto } from '../transfer-preview-query.dto';

describe('TransferPreviewQueryDto', () => {
	test('accepts a destination project id', () => {
		expect(TransferPreviewQueryDto.safeParse({ destinationProjectId: '1234' }).success).toBe(true);
	});

	test.each([
		{ name: 'a missing destination', input: {} },
		{ name: 'an empty destination', input: { destinationProjectId: '' } },
		{ name: 'a non-string destination', input: { destinationProjectId: 1234 } },
	])('rejects $name', ({ input }) => {
		const result = TransferPreviewQueryDto.safeParse(input);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['destinationProjectId']);
	});
});
