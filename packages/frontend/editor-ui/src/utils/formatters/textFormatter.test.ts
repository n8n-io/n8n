import { truncateBeforeLast } from './textFormatter';

describe(truncateBeforeLast, () => {
	it('should return unmodified text if the length does not exceed max length', () => {
		expect(truncateBeforeLast('I love nodemation', 25)).toBe('I love nodemation');
		expect(truncateBeforeLast('Nodemation is cool', 25)).toBe('Nodemation is cool');
		expect(truncateBeforeLast('Internationalization', 25)).toBe('Internationalization');
	});

	it('should remove chars just before the last word, as long as the last word is under 15 chars', () => {
		expect(truncateBeforeLast('I love nodemation', 15)).toBe('I lo…nodemation');
		expect(truncateBeforeLast('I love "nodemation"', 15)).toBe('I …"nodemation"');
		expect(truncateBeforeLast('Nodemation is cool', 15)).toBe('Nodemation…cool');
		expect(truncateBeforeLast('"Nodemation" is cool', 15)).toBe('"Nodematio…cool');
		expect(truncateBeforeLast('Is it fun to automate boring stuff?', 15)).toBe('Is it fu…stuff?');
		expect(truncateBeforeLast('Is internationalization fun?', 15)).toBe('Is interna…fun?');
	});

	it('should preserve last 5 characters if the last word is longer than 15 characters', () => {
		expect(truncateBeforeLast('I love internationalization', 25)).toBe('I love internationa…ation');
		expect(truncateBeforeLast('I love "internationalization"', 25)).toBe(
			'I love "internation…tion"',
		);
		expect(truncateBeforeLast('I "love" internationalization', 25)).toBe(
			'I "love" internatio…ation',
		);
		expect(truncateBeforeLast('Internationalization', 15)).toBe('Internati…ation');
	});
});
