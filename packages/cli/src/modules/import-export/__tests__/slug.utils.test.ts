import { generateSlug } from '../slug.utils';

describe('generateSlug', () => {
	it('should generate a slug from name and short ID', () => {
		expect(generateSlug('billing', '550e8400-e29b')).toBe('billing-550e84');
	});

	it('should lowercase the name', () => {
		expect(generateSlug('My Project', 'abc123def')).toBe('my-project-abc123');
	});

	it('should replace spaces with hyphens', () => {
		expect(generateSlug('my cool project', '123456')).toBe('my-cool-project-123456');
	});

	it('should strip special characters', () => {
		expect(generateSlug('billing!@#$%^&*()', 'aaaaaa')).toBe('billing-aaaaaa');
	});

	it('should collapse multiple hyphens', () => {
		expect(generateSlug('my---project', 'bbbbbb')).toBe('my-project-bbbbbb');
	});

	it('should return just shortId when name produces empty slug', () => {
		expect(generateSlug('!!!', 'cccccc')).toBe('cccccc');
	});

	it('should replace known emojis with their names', () => {
		expect(generateSlug('\u{1F9FE} billing', 'dddddd')).toBe('receipt-billing-dddddd');
	});

	it('should handle empty name', () => {
		expect(generateSlug('', 'eeeeee')).toBe('eeeeee');
	});

	it('should trim leading and trailing hyphens', () => {
		expect(generateSlug('-project-', 'ffffff')).toBe('project-ffffff');
	});

	it('should handle names with only emojis', () => {
		expect(generateSlug('\u{1F680}', 'gggggg')).toBe('rocket-gggggg');
	});

	it('should use first 6 characters of the ID', () => {
		expect(generateSlug('test', '1234567890abcdef')).toBe('test-123456');
	});
});
