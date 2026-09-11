import { UpdatedTagPublicDto, UpdateTagPublicDto } from '../tag-public.dto';

describe('UpdateTagPublicDto', () => {
	test('should accept a name', () => {
		const result = UpdateTagPublicDto.safeParse({ name: 'Production' });

		expect(result.success).toBe(true);
	});

	test('should accept a name the tag service rejects, as the published spec does', () => {
		const result = UpdateTagPublicDto.safeParse({ name: '' });

		expect(result.success).toBe(true);
	});

	test('should reject a missing name', () => {
		const result = UpdateTagPublicDto.safeParse({});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['name']);
	});

	test.each(['id', 'createdAt', 'updatedAt'])('should reject the read-only %s', (field) => {
		const result = UpdateTagPublicDto.safeParse({ name: 'Production', [field]: 'value' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual([field]);
		expect(result.error?.issues[0].message).toBe('is read-only');
	});

	test('should reject an unknown field', () => {
		const result = UpdateTagPublicDto.safeParse({ name: 'Production', unknown: 'value' });

		expect(result.success).toBe(false);
	});
});

describe('UpdatedTagPublicDto', () => {
	test('should accept a response without createdAt', () => {
		const result = UpdatedTagPublicDto.safeParse({
			id: '2tUt1wbLX592XDdX',
			name: 'Production',
			updatedAt: '2024-01-01T00:00:00.000Z',
		});

		expect(result.success).toBe(true);
	});

	test('should reject a response without updatedAt', () => {
		const result = UpdatedTagPublicDto.safeParse({ id: '2tUt1wbLX592XDdX', name: 'Production' });

		expect(result.success).toBe(false);
	});
});
