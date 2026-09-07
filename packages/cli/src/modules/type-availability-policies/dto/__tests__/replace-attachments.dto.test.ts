import { ReplaceAttachmentsDto } from '../replace-attachments.dto';

describe('ReplaceAttachmentsDto', () => {
	it('accepts an empty attachment list', () => {
		expect(ReplaceAttachmentsDto.safeParse({ attachments: [] }).success).toBe(true);
	});

	it('accepts a list of attachments with unique policyIds and (isFloor, priority) pairs', () => {
		expect(
			ReplaceAttachmentsDto.safeParse({
				attachments: [
					{ policyId: 'p1', priority: 0, isFloor: false },
					{ policyId: 'p2', priority: 0, isFloor: true },
					{ policyId: 'p3', priority: 1, isFloor: false },
				],
			}).success,
		).toBe(true);
	});

	it('rejects duplicate policyId values', () => {
		const result = ReplaceAttachmentsDto.safeParse({
			attachments: [
				{ policyId: 'p1', priority: 0, isFloor: false },
				{ policyId: 'p1', priority: 1, isFloor: false },
			],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Duplicate policyId values are not allowed');
		}
	});

	it('rejects duplicate (isFloor, priority) pairs across different policies', () => {
		const result = ReplaceAttachmentsDto.safeParse({
			attachments: [
				{ policyId: 'p1', priority: 0, isFloor: false },
				{ policyId: 'p2', priority: 0, isFloor: false },
			],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				'Duplicate (isFloor, priority) pairs are not allowed',
			);
		}
	});

	it('can be constructed directly from an already-valid payload', () => {
		const dto = new ReplaceAttachmentsDto({ attachments: [] });

		expect(dto.attachments).toEqual([]);
	});

	it('throws when parsing an invalid payload', () => {
		expect(() =>
			ReplaceAttachmentsDto.parse({
				attachments: [
					{ policyId: 'p1', priority: 0, isFloor: false },
					{ policyId: 'p1', priority: 1, isFloor: false },
				],
			}),
		).toThrow();
	});
});
