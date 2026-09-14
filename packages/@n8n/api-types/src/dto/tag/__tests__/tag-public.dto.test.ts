import { CreateTagPublicDto, TagPublicDto } from '../tag-public.dto';

describe('CreateTagPublicDto', () => {
	test('should accept a name on its own', () => {
		const result = CreateTagPublicDto.safeParse({ name: 'Production' });

		expect(result.success).toBe(true);
	});

	test('should accept a name the entity validator later rejects', () => {
		const result = CreateTagPublicDto.safeParse({ name: '' });

		expect(result.success).toBe(true);
	});

	test.each([
		{ name: 'a missing name', request: {}, path: ['name'] },
		{ name: 'a non-string name', request: { name: 42 }, path: ['name'] },
	])('should reject $name', ({ request, path }) => {
		const result = CreateTagPublicDto.safeParse(request);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(path);
	});

	test.each(['id', 'createdAt', 'updatedAt'])('should reject the read-only %s', (key) => {
		const result = CreateTagPublicDto.safeParse({ name: 'Production', [key]: 'anything' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual([key]);
		expect(result.error?.issues[0].message).toBe('is read-only');
	});

	test('should reject an unknown property', () => {
		const result = CreateTagPublicDto.safeParse({ name: 'Production', unknown: true });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].code).toBe('unrecognized_keys');
	});
});

describe('TagPublicDto', () => {
	test('should accept the published tag shape', () => {
		const result = TagPublicDto.safeParse({
			id: '2tUt1wbLX592XDdX',
			name: 'Production',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z',
		});

		expect(result.success).toBe(true);
	});

	test.each(['id', 'name', 'createdAt', 'updatedAt'])('should require %s', (key) => {
		const tag: Record<string, string> = {
			id: '2tUt1wbLX592XDdX',
			name: 'Production',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z',
		};
		delete tag[key];

		const result = TagPublicDto.safeParse(tag);

		expect(result.success).toBe(false);
	});
});
