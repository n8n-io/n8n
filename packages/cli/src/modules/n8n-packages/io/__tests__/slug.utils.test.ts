import { generateSlug } from '../slug.utils';

describe('generateSlug', () => {
	it('lower-cases and hyphenates the name', () => {
		expect(generateSlug('My Workflow')).toBe('my-workflow');
	});

	it('collapses whitespace and strips disallowed characters', () => {
		expect(generateSlug('  Hello,   World!  ')).toBe('hello-world');
	});

	it('replaces known emojis with their canonical name', () => {
		expect(generateSlug('💳 Payments')).toBe('credit-card-payments');
	});

	it('falls back to "workflow" when the name yields an empty slug', () => {
		expect(generateSlug('🤷‍♂️')).toBe('workflow');
	});

	it("strips unknown emoji's", () => {
		expect(generateSlug('my-workflow 🤷‍♂️')).toBe('my-workflow');
	});

	it('strips leading and trailing hyphens', () => {
		expect(generateSlug('---foo---')).toBe('foo');
	});
});
