import { slugFromName, slugWithSuffix } from '../collection-slug';

describe('slugFromName', () => {
	it.each([
		['Returns playbook', 'returns_playbook'],
		['  Customer   support!  ', 'customer_support'],
		['Política de devoluciones', 'politica_de_devoluciones'],
		['Naïve café résumé guide 2026!', 'naive_cafe_resume_guide'],
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

	it('uses a nano id for a name without Latin letters or digits', () => {
		expect(slugFromName('日本語 ✨')).toMatch(/^[0-9A-Za-z]{16}$/);
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
