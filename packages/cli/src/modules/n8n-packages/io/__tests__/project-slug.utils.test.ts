import { generateProjectSlug } from '../project-slug.utils';

describe('generateProjectSlug', () => {
	it('should generate a slug from name and short ID', () => {
		expect(generateProjectSlug('billing', '550e8400-e29b')).toBe('billing-550e84');
	});

	it('should lowercase the name', () => {
		expect(generateProjectSlug('My Project', 'abc123def')).toBe('my-project-abc123');
	});

	it('should replace spaces with hyphens', () => {
		expect(generateProjectSlug('my cool project', '123456')).toBe('my-cool-project-123456');
	});

	it('should strip special characters', () => {
		expect(generateProjectSlug('billing!@#$%^&*()', 'aaaaaa')).toBe('billing-aaaaaa');
	});

	it('should return just shortId when name produces empty slug', () => {
		expect(generateProjectSlug('!!!', 'cccccc')).toBe('cccccc');
	});

	it('should strip emojis from the name', () => {
		expect(generateProjectSlug('\u{1F9FE} billing', 'dddddd')).toBe('billing-dddddd');
	});

	it('should return just shortId when name is only an emoji', () => {
		expect(generateProjectSlug('\u{1F9FE}', 'ffffff')).toBe('ffffff');
	});

	it('should handle empty name', () => {
		expect(generateProjectSlug('', 'eeeeee')).toBe('eeeeee');
	});
});
