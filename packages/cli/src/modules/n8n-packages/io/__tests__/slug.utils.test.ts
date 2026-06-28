import { generateSlug } from '../slug.utils';

describe('generateSlug', () => {
	it('lower-cases and hyphenates the name', () => {
		expect(generateSlug('My Workflow')).toBe('my-workflow');
	});

	it('collapses whitespace and strips disallowed characters', () => {
		expect(generateSlug('  Hello,   World!  ')).toBe('hello-world');
	});

	it('removes emojis', () => {
		expect(generateSlug('💳 Payments')).toBe('payments');
	});

	it('falls back to "workflow" when the name yields an empty slug', () => {
		expect(generateSlug('--')).toBe('workflow');
	});

	it('uses a caller-provided fallback when the name yields an empty slug', () => {
		expect(generateSlug('--', 'credential')).toBe('credential');
		expect(generateSlug('', 'credential')).toBe('credential');
	});

	it('strips leading and trailing hyphens', () => {
		expect(generateSlug('---foo---')).toBe('foo');
	});
});
