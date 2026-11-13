import { pinnedHeading, scrollTopBelowHeading, type HeadingPlacement } from './stickyHeading';

const headings: HeadingPlacement[] = [
	{ key: 'recent', label: 'Recent', top: 0, height: 40 },
	{ key: 'older', label: 'Older', top: 400, height: 40 },
];

describe('pinnedHeading', () => {
	it('stays empty when the list has no heading', () => {
		expect(pinnedHeading([], 80)).toBeUndefined();
	});

	it('leaves the heading in place until the list scrolls past it', () => {
		expect(pinnedHeading(headings, 0)).toBeUndefined();
		expect(
			pinnedHeading([{ key: 'later', label: 'Later', top: 80, height: 40 }], 80),
		).toBeUndefined();
	});

	it('pins the heading that the scroll position has passed', () => {
		expect(pinnedHeading(headings, 120)).toEqual({
			key: 'recent',
			label: 'Recent',
			height: 40,
			offset: 0,
		});
	});

	it('shifts the pinned heading up when the next heading reaches it', () => {
		expect(pinnedHeading(headings, 380)).toEqual({
			key: 'recent',
			label: 'Recent',
			height: 40,
			offset: -20,
		});
	});

	it('keeps the last heading pinned through the end of the list', () => {
		expect(pinnedHeading(headings, 480)).toEqual({
			key: 'older',
			label: 'Older',
			height: 40,
			offset: 0,
		});
	});

	it('does not pin a heading with no height', () => {
		expect(
			pinnedHeading([{ key: 'recent', label: 'Recent', top: 0, height: 0 }], 20),
		).toBeUndefined();
	});
});

describe('scrollTopBelowHeading', () => {
	const headings: HeadingPlacement[] = [
		{ key: 'recent', label: 'Recent', top: 0, height: 40 },
		{ key: 'older', label: 'Older', top: 400, height: 32 },
	];

	it('uses the row top when no heading covers it', () => {
		expect(scrollTopBelowHeading([], 80, false)).toBe(80);
	});

	it('places the first row under a heading at that heading', () => {
		expect(scrollTopBelowHeading(headings, 40, false)).toBe(0);
	});

	it('places a row below the heading that covers it', () => {
		expect(scrollTopBelowHeading(headings, 120, false)).toBe(80);
		expect(scrollTopBelowHeading(headings, 440, false)).toBe(408);
	});

	it('places a heading at its own top', () => {
		expect(scrollTopBelowHeading(headings, 400, true)).toBe(400);
	});

	it('ignores a heading with no height', () => {
		expect(
			scrollTopBelowHeading([{ key: 'recent', label: 'Recent', top: 0, height: 0 }], 80, false),
		).toBe(80);
	});
});
