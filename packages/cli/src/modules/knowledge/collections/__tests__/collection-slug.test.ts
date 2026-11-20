import { slugFromName, slugWithSuffix } from '../collection-slug';

describe('slugFromName', () => {
	it.each([
		['Returns playbook', 'returns_playbook'],
		['  Customer   support!  ', 'customer_support'],
		['Política de devoluciones', 'politica_de_devoluciones'],
		['Q4 2026 / Sales-Ops', 'q4_2026_sales_ops'],
		['Every help-centre article and macro', 'every_help_centre_articl'],
	])('makes %j into %j', (name, slug) => {
		expect(slugFromName(name)).toBe(slug);
	});

	it('keeps at most 24 characters and no trailing underscore', () => {
		const slug = slugFromName('abcdefghijklmnopqrstuvw xyz');

		expect(slug).toBe('abcdefghijklmnopqrstuvw');
		expect(slug.length).toBeLessThanOrEqual(24);
	});

	it('uses a fallback for a name without letters or digits', () => {
		expect(slugFromName('日本語 ✨')).toBe('collection');
	});
});

describe('slugWithSuffix', () => {
	it('appends the suffix and keeps at most 24 characters', () => {
		const slug = slugWithSuffix('every_help_centre_articl', 'a1b2c3');

		expect(slug).toBe('every_help_centre_a1b2c3');
		expect(slug.length).toBe(24);
	});

	it('does not leave two underscores before the suffix', () => {
		expect(slugWithSuffix('customer_support_team', 'a1b2c3')).toBe('customer_support_a1b2c3');
	});
});
