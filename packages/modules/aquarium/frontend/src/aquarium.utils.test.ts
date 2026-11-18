import { displayProjectName } from './aquarium.utils';

describe('displayProjectName', () => {
	it.each([
		['Jane Doe <jane@example.com>', 'Jane Doe'],
		['Sales', 'Sales'],
		['A <b> team', 'A <b> team'],
		['<only@example.com>', '<only@example.com>'],
	])('shows %s as %s', (name, expected) => {
		expect(displayProjectName(name)).toBe(expected);
	});
});
