import {
	asStringList,
	humanize,
	isPlainObject,
	plural,
	rlcLabel,
	stripHtml,
	truncate,
} from './format';

describe('format helpers', () => {
	it('strips html and collapses whitespace', () => {
		expect(stripHtml('<p>Hi <b>Anna</b>,</p>\n<p>the&nbsp;invoice &amp; more</p>')).toBe(
			'Hi Anna, the invoice & more',
		);
	});
	it('truncates with an ellipsis', () => {
		expect(truncate('abcdef', 4)).toBe('abc…');
		expect(truncate('abc', 4)).toBe('abc');
	});
	it('reads resource locator labels', () => {
		expect(
			rlcLabel({ __rl: true, mode: 'list', value: 'gid=0', cachedResultName: 'Leads 2026' }),
		).toBe('Leads 2026');
		expect(rlcLabel({ __rl: true, mode: 'id', value: 'abc' })).toBe('abc');
		expect(rlcLabel('plain')).toBe('plain');
		expect(rlcLabel(undefined)).toBe('');
	});
	it('splits comma separated recipients', () => {
		expect(asStringList('a@x.com, b@x.com,,')).toEqual(['a@x.com', 'b@x.com']);
		expect(asStringList(['a', ' b '])).toEqual(['a', 'b']);
	});
	it('humanizes keys and pluralizes', () => {
		expect(humanize('bySource')).toBe('By source');
		expect(humanize('week_start')).toBe('Week start');
		expect(plural(1, 'row')).toBe('1 row');
		expect(plural(3, 'row')).toBe('3 rows');
	});
	it('recognises plain objects only', () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject({ a: 1 })).toBe(true);
		expect(isPlainObject(null)).toBe(false);
		expect(isPlainObject(undefined)).toBe(false);
		expect(isPlainObject('text')).toBe(false);
		expect(isPlainObject(42)).toBe(false);
		expect(isPlainObject([{ a: 1 }])).toBe(false);
	});
});
