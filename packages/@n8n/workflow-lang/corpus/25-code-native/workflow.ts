/**
 * Runtime support for native Code nodes: `RegExp.exec` (spec section 4.6),
 * full Unicode case mapping, a string as an object (spread, Object.assign,
 * Object.keys), and null elements.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ text: string; list: Array<string | null> }>({ path: 'code-native' })],
	async run(ctx, trigger) {
		const s = trigger.body.text;
		const list = trigger.body.list;
		// Untyped, as in a Code node: TypeScript rejects a spread of a string type.
		const word: unknown = 'ab';
		const dates: number[][] = [];
		let at = 0;
		for (;;) {
			const m = RegExp.exec('(\\d{4})-(\\d{2})(?:-(\\d{2}))?', 'g', s, at);
			if (m === null) break;
			dates.push(m);
			at = m[1];
		}
		const result = {
			dates,
			sticky: RegExp.exec('ab', 'y', 'xab', 1),
			stickyMiss: RegExp.exec('ab', 'y', 'xab', 0),
			ignoreCase: RegExp.exec('straße|ΣΊΣΥΦΟΣ', 'i', 'Der STRASSE, σίσυφος', 0),
			lookahead: RegExp.exec('\\w+(?=!)', '', 'hi there!', 0),
			backref: RegExp.exec('(["\'])(.*?)\\1', '', 'say "hi"', 0),
			unicode: RegExp.exec('^.$', 'u', '😀', 0),
			upper: 'straße ǰ ﬁ Σ ПРИВЕТ istanbul'.toUpperCase(),
			lower: 'ΟΔΟΣ Σ İSTANBUL ПРИВЕТ'.toLowerCase(),
			spread: { ...(word as object) },
			assigned: Object.assign({}, word),
			keys: Object.keys(word as object),
			nulls: list.map((x) => x !== null),
			kept: list.filter((x) => x !== null),
		};
		await ctx.http({
			name: 'Store',
			method: 'POST',
			url: 'https://example.test/store',
			body: result,
		});
		return result;
	},
});
