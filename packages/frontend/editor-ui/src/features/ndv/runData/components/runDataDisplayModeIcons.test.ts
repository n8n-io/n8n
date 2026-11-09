import { iconFor } from './runDataDisplayModeIcons';

describe('iconFor', () => {
	it.each([
		['ai', 'text'],
		['html', 'file-code'],
		['schema', 'schema'],
		['table', 'table'],
		['json', 'json'],
		['binary', 'binary'],
	])('should return the icon of the %s mode', (mode, icon) => {
		expect(iconFor(mode)).toBe(icon);
	});

	it('should return undefined for a mode with no icon', () => {
		expect(iconFor('unknown')).toBeUndefined();
	});
});
