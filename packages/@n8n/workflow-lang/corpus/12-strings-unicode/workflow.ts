/** String methods on non-ASCII text, with UTF-16 code unit positions. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ text: string }>({ path: 'strings' })],
	async run(ctx, trigger) {
		const s = trigger.body.text;
		const emoji = '😀';
		const out = {
			length: s.length,
			emojiLength: emoji.length,
			upper: s.toUpperCase(),
			lower: s.toLowerCase(),
			trimmed: `  ${s}  `.trim(),
			trimStart: '  x '.trimStart(),
			trimEnd: ' x  '.trimEnd(),
			indexOf: s.indexOf('é'),
			indexOfEmoji: s.indexOf(emoji),
			sliceEmoji: s.slice(s.indexOf(emoji), s.indexOf(emoji) + 1),
			sliceNeg: s.slice(-3),
			substring: s.substring(5, 1),
			charAt: s.charAt(1),
			charCode: s.charCodeAt(s.indexOf(emoji)),
			charCodeLow: s.charCodeAt(s.indexOf(emoji) + 1),
			at: s.at(-1),
			index: s[2],
			split: s.split(' '),
			splitEmpty: 'abc'.split(''),
			replace: s.replace('ü', 'ue'),
			replaceAll: 'a-b-c'.replaceAll('-', '+'),
			replaceDollar: 'x'.replace('x', '$&$&'),
			padStart: '7'.padStart(3, '0'),
			padEnd: 'ab'.padEnd(5, 'xy'),
			repeat: 'ß'.repeat(3),
			startsWith: s.startsWith('Grü'),
			endsWith: s.endsWith('!'),
			includes: s.includes('😀'),
			concat: 'a'.concat('b', 'c'),
			compare: ['é' < 'z', 'Z' < 'a', '😀' > 'ﬀ'],
			upperSharp: 'straße'.toUpperCase(),
		};
		await ctx.http({ name: 'Store', method: 'POST', url: 'https://api.example.com', body: out });
		return out;
	},
});
