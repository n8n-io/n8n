import { getInitials } from '../labelUtil';

describe('labelUtil.getInitials', () => {
	it.each([
		['', ''],

		// simple words
		['Hello', 'He'],
		['Hello World', 'HW'],
		['H', 'H'],

		// multiple spaces
		['Double  Space', 'DS'],
		['        ', ''],

		// simple emoji
		['👋 Hello', '👋H'],
		['👋Hello', '👋H'],
		['Hello 👋', 'H👋'],
		['Hello👋', 'He'],

		// combined emojis
		['1️⃣ 1️⃣', '1️⃣1️⃣'],
		['1️⃣', '1️⃣'],
		['👩‍⚕️D 👩‍⚕️D', '👩‍⚕️👩‍⚕️'],
	])('turns "%s" into "%s"', (input, output) => {
		expect(getInitials(input)).toBe(output);
	});
});
