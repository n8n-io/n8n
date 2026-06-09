import { splitLeadingEmoji } from '../desktop-assistant.helpers';

describe('splitLeadingEmoji', () => {
	test('extracts a single emoji and trims the trailing space', () => {
		expect(splitLeadingEmoji('🍌 Daily banana prices')).toEqual({
			emoji: '🍌',
			rest: 'Daily banana prices',
		});
	});

	test('extracts a multi-codepoint ZWJ sequence as one emoji', () => {
		expect(splitLeadingEmoji('👨‍💻 Coding assistant')).toEqual({
			emoji: '👨\u200d💻',
			rest: 'Coding assistant',
		});
	});

	test('leaves plain text strings untouched', () => {
		expect(splitLeadingEmoji('Daily banana prices')).toEqual({
			rest: 'Daily banana prices',
		});
	});

	test('treats numbers and symbols as plain text, not emoji', () => {
		expect(splitLeadingEmoji('12 weekly reports')).toEqual({ rest: '12 weekly reports' });
		expect(splitLeadingEmoji('#alerts pipeline')).toEqual({ rest: '#alerts pipeline' });
	});

	test('does not require a space after the emoji', () => {
		expect(splitLeadingEmoji('🍌Banana')).toEqual({ emoji: '🍌', rest: 'Banana' });
	});

	test('returns the emoji alone with an empty rest when the input has nothing after it', () => {
		expect(splitLeadingEmoji('🍌')).toEqual({ emoji: '🍌', rest: '' });
	});

	test('handles variation-selector-16 (emoji presentation) on warning-style glyphs', () => {
		const input = '⚠️ Action needed';
		const { emoji, rest } = splitLeadingEmoji(input);
		expect(emoji).toMatch(/⚠/);
		expect(rest).toBe('Action needed');
	});

	test('does not mistake leading whitespace for an emoji', () => {
		expect(splitLeadingEmoji('   🍌 Banana')).toEqual({ rest: '   🍌 Banana' });
	});

	test('extracts a base emoji + skin-tone modifier as one cluster', () => {
		expect(splitLeadingEmoji('👍🏽 Banana')).toEqual({
			emoji: '👍🏽',
			rest: 'Banana',
		});
	});

	test('extracts a flag sequence (paired regional indicators)', () => {
		expect(splitLeadingEmoji('🇩🇪 Banana')).toEqual({
			emoji: '🇩🇪',
			rest: 'Banana',
		});
	});

	test('extracts a ZWJ sequence whose base carries a skin-tone modifier', () => {
		expect(splitLeadingEmoji('👨🏽‍💻 Coding')).toEqual({
			emoji: '👨🏽‍💻',
			rest: 'Coding',
		});
	});
});
