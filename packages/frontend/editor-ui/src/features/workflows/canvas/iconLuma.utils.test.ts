import { FULL_LUMA_RANGE, getLumaRange, getLumaRemapTable } from './iconLuma.utils';

function pixels(...rgba: Array<[number, number, number, number]>) {
	return new Uint8ClampedArray(rgba.flat());
}

function parseTable(table: string) {
	return table.split(' ').map(Number);
}

describe('getLumaRange', () => {
	it('returns null when no pixel is opaque', () => {
		expect(getLumaRange(pixels([255, 255, 255, 0], [0, 0, 0, 127]))).toBeNull();
	});

	it('ignores transparent pixels', () => {
		const range = getLumaRange(pixels([0, 0, 0, 255], [255, 255, 255, 0]));

		expect(range).toEqual({ lo: 0, hi: 0 });
	});

	it('uses Rec. 709 luma weights', () => {
		const range = getLumaRange(pixels([0, 255, 0, 255]));

		expect(range?.lo).toBeCloseTo(0.7152);
	});

	it('reads the 5th and 95th percentiles', () => {
		const data = Array.from({ length: 100 }, (_, i): [number, number, number, number] => {
			const v = Math.round((i / 99) * 255);
			return [v, v, v, 255];
		});

		const range = getLumaRange(pixels(...data));

		expect(range?.lo).toBeCloseTo(5 / 99, 2);
		expect(range?.hi).toBeCloseTo(95 / 99, 2);
	});
});

describe('getLumaRemapTable', () => {
	it('maps the full range linearly onto floor…1', () => {
		const table = parseTable(getLumaRemapTable(FULL_LUMA_RANGE, 0.75));

		expect(table[0]).toBe(0.75);
		expect(table[16]).toBe(0.875);
		expect(table.at(-1)).toBe(1);
	});

	it('stretches a narrow range and clamps values outside it', () => {
		const table = parseTable(getLumaRemapTable({ lo: 0.25, hi: 0.75 }, 0.5));

		expect(table[0]).toBe(0.5);
		expect(table[8]).toBe(0.5);
		expect(table[16]).toBe(0.75);
		expect(table[24]).toBe(1);
		expect(table.at(-1)).toBe(1);
	});

	it('maps a flat icon to the top of the band', () => {
		const table = parseTable(getLumaRemapTable({ lo: 0.41, hi: 0.42 }, 0.75));

		expect(new Set(table)).toEqual(new Set([1]));
	});
});
