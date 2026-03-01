import { truncateBeforeLast, truncate } from './truncate';

describe('truncate', () => {
	it('should truncate text to 30 chars by default', () => {
		expect(truncate('This is a very long text that should be truncated')).toBe(
			'This is a very long text that ...',
		);
	});

	it('should truncate text to given length', () => {
		expect(truncate('This is a very long text that should be truncated', 25)).toBe(
			'This is a very long text ...',
		);
	});
});

describe(truncateBeforeLast, () => {
	it('should return unmodified text if the length does not exceed max length', () => {
		expect(truncateBeforeLast('I love nodemation', 25)).toBe('I love nodemation');
		expect(truncateBeforeLast('I ❤️ nodemation', 25)).toBe('I ❤️ nodemation');
		expect(truncateBeforeLast('Nodemation is cool', 25)).toBe('Nodemation is cool');
		expect(truncateBeforeLast('Internationalization', 25)).toBe('Internationalization');
		expect(truncateBeforeLast('I love 👨‍👩‍👧‍👦', 8)).toBe('I love 👨‍👩‍👧‍👦');
	});

	it('should remove chars just before the last word, as long as the last word is under 15 chars', () => {
		expect(truncateBeforeLast('I love nodemation', 15)).toBe('I lo…nodemation');
		expect(truncateBeforeLast('I love "nodemation"', 15)).toBe('I …"nodemation"');
		expect(truncateBeforeLast('I ❤️ nodemation', 13)).toBe('I …nodemation');
		expect(truncateBeforeLast('Nodemation is cool', 15)).toBe('Nodemation…cool');
		expect(truncateBeforeLast('"Nodemation" is cool', 15)).toBe('"Nodematio…cool');
		expect(truncateBeforeLast('Is it fun to automate boring stuff?', 15)).toBe('Is it fu…stuff?');
		expect(truncateBeforeLast('Is internationalization fun?', 15)).toBe('Is interna…fun?');
		expect(truncateBeforeLast('I love 👨‍👩‍👧‍👦', 7)).toBe('I lov…👨‍👩‍👧‍👦');
	});

	it('should preserve last 5 characters if the last word is longer than 15 characters', () => {
		expect(truncateBeforeLast('I love internationalization', 25)).toBe('I love internationa…ation');
		expect(truncateBeforeLast('I love "internationalization"', 25)).toBe(
			'I love "internation…tion"',
		);
		expect(truncateBeforeLast('I "love" internationalization', 25)).toBe(
			'I "love" internatio…ation',
		);
		expect(truncateBeforeLast('I ❤️ internationalization', 9)).toBe('I ❤️…ation');
		expect(truncateBeforeLast('I ❤️ internationalization', 8)).toBe('I …ation');
		expect(truncateBeforeLast('Internationalization', 15)).toBe('Internati…ation');
	});
});
