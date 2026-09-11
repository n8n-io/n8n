import { createCitationMarkerStripper, stripCitationMarkers } from '../citation-markers';

// U+E200 start, U+E201 end, U+E202 separator, U+E203 navlist start.
const S = '\uE200';
const E = '\uE201';
const SEP = '\uE202';
const NAV = '\uE203';
const span = (ref: string) => `${S}cite${SEP}${ref}${E}`;

describe('stripCitationMarkers', () => {
	it('returns text unchanged when it has no markers', () => {
		expect(stripCitationMarkers('plain text')).toBe('plain text');
	});

	it('removes a complete inline citation span', () => {
		expect(stripCitationMarkers(`Price is $20${span('turn0search0')}.`)).toBe('Price is $20.');
	});

	it('removes multiple spans and navlist spans', () => {
		const text = `a${span('turn0search0')}b${NAV}nav${SEP}turn0news1${E}c`;
		expect(stripCitationMarkers(text)).toBe('abc');
	});

	it('removes orphan markers left by an unterminated span', () => {
		expect(stripCitationMarkers(`tail${S}cite${SEP}turn0search0`)).toBe('tailciteturn0search0');
	});
});

describe('createCitationMarkerStripper', () => {
	it('strips a span contained in a single delta', () => {
		const s = createCitationMarkerStripper();
		expect(s.push(`hello${span('turn0search0')} world`)).toBe('hello world');
		expect(s.flush()).toBe('');
	});

	it('holds back a span that straddles two deltas', () => {
		const s = createCitationMarkerStripper();
		// Split the span across chunk boundaries.
		expect(s.push(`hello${S}cite`)).toBe('hello');
		expect(s.push(`${SEP}turn0search0`)).toBe('');
		expect(s.push(`${E} world`)).toBe(' world');
		expect(s.flush()).toBe('');
	});

	it('flushes clean text when a span never closes', () => {
		const s = createCitationMarkerStripper();
		expect(s.push(`done${S}cite${SEP}turn0`)).toBe('done');
		expect(s.flush()).toBe('citeturn0');
	});
});
