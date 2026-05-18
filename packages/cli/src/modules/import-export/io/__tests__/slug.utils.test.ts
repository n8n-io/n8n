import { generateSlug } from '../slug.utils';

describe('generateSlug', () => {
	it('lower-cases the name and appends a 6-char id suffix', () => {
		expect(generateSlug('My Workflow', 'abc1234567')).toBe('my-workflow-abc123');
	});

	it('collapses whitespace and stripping disallowed characters', () => {
		expect(generateSlug('  Hello,   World!  ', 'abcdef9999')).toBe('hello-world-abcdef');
	});

	it('replaces known emojis with their canonical name', () => {
		expect(generateSlug('💳 Payments', 'id123456')).toBe('credit-card-payments-id1234');
	});

	it('falls back to the short id when the name yields an empty slug', () => {
		expect(generateSlug('🤷‍♂️', 'shortid12')).toBe('shorti');
	});

	it('truncates the id to 6 characters', () => {
		expect(generateSlug('x', 'this-is-a-long-id')).toBe('x-this-i');
	});

	it('strips leading and trailing hyphens', () => {
		expect(generateSlug('---foo---', 'xyz1234567')).toBe('foo-xyz123');
	});
});
