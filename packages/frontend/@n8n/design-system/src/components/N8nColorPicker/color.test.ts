import { formatColor, parseColor } from './color';

describe('color', () => {
	it('writes hex when alpha is hidden', () => {
		expect(formatColor(parseColor('#ff0000')!, undefined, false)).toBe('#FF0000');
		expect(formatColor(parseColor('#00ff00')!, undefined, false)).toBe('#00FF00');
		expect(formatColor(parseColor('#0000ff')!, undefined, false)).toBe('#0000FF');
		expect(formatColor(parseColor('#fff')!, undefined, false)).toBe('#FFFFFF');
		expect(formatColor(parseColor('#000000')!, undefined, false)).toBe('#000000');
	});

	it('writes rgba when alpha is shown and the format is omitted', () => {
		expect(formatColor(parseColor('rgba(255, 0, 0, 0.5)')!, undefined, true)).toBe(
			'rgba(255, 0, 0, 0.5)',
		);
		expect(formatColor(parseColor('#FF0000')!, undefined, true)).toBe('rgba(255, 0, 0, 1)');
	});

	it('writes the requested format', () => {
		const red = parseColor('#FF0000')!;
		expect(formatColor(red, 'hex', true)).toBe('#FF0000FF');
		expect(formatColor(red, 'rgb', false)).toBe('rgb(255, 0, 0)');
		expect(formatColor(red, 'hsl', false)).toBe('hsl(0, 100%, 50%)');
		expect(formatColor(red, 'hsv', false)).toBe('hsv(0, 100%, 100%)');
	});

	it('reads an 8-digit hex alpha channel', () => {
		expect(formatColor(parseColor('#FF000080')!, 'hex', true)).toBe('#FF000080');
	});

	it('rejects a value that is not a color', () => {
		expect(parseColor('')).toBeNull();
		expect(parseColor(null)).toBeNull();
		expect(parseColor('red')).toBeNull();
	});
});
