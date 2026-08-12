import { generateSlug } from '../slug.utils';

describe('generateSlug', () => {
	it('lower-cases and hyphenates the name', () => {
		expect(generateSlug('My Workflow', 'workflow')).toBe('my-workflow');
	});

	it('collapses whitespace and strips disallowed characters', () => {
		expect(generateSlug('  Hello,   World!  ', 'workflow')).toBe('hello-world');
	});

	it('removes emojis', () => {
		expect(generateSlug('💳 Payments', 'workflow')).toBe('payments');
	});

	it('uses the fallback when the name yields an empty slug', () => {
		expect(generateSlug('--', 'workflow')).toBe('workflow');
		expect(generateSlug('', 'credential')).toBe('credential');
	});

	it('strips leading and trailing hyphens', () => {
		expect(generateSlug('---foo---', 'workflow')).toBe('foo');
	});
});
