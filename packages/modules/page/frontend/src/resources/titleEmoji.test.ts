import { splitTitleEmoji } from './titleEmoji';

describe('splitTitleEmoji', () => {
	it.each([
		['a simple emoji', '🚀 Launch plan', { emoji: '🚀', text: 'Launch plan' }],
		['an emoji without a space', '📦Orders', { emoji: '📦', text: 'Orders' }],
		['an emoji with a skin tone', '👍🏽 Approved', { emoji: '👍🏽', text: 'Approved' }],
		['a family joined by zero-width joiners', '👨‍👩‍👧 Team', { emoji: '👨‍👩‍👧', text: 'Team' }],
		['a flag', '🇫🇷 Paris office', { emoji: '🇫🇷', text: 'Paris office' }],
		['an emoji with a variation selector', '❤️ Thanks', { emoji: '❤️', text: 'Thanks' }],
		['spaces before the emoji', '  🧪 Tests', { emoji: '🧪', text: 'Tests' }],
		['only the first of two emojis', '🔥🔥 Incident', { emoji: '🔥', text: '🔥 Incident' }],
	])('takes %s as the icon', (_case, title, expected) => {
		expect(splitTitleEmoji(title)).toEqual(expected);
	});

	it.each([
		['a plain title', 'Runbook'],
		['an emoji in the middle', 'Launch 🚀 plan'],
		['a title that is only an emoji', '🚀'],
		['a title that starts with a digit', '1 Getting started'],
		['an empty title', ''],
	])('keeps %s whole', (_case, title) => {
		expect(splitTitleEmoji(title)).toEqual({ text: title });
	});
});
