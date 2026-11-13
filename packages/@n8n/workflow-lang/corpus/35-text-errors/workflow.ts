/**
 * Unicode normalization (all four forms), localeCompare (CLDR root) and the messages of JSON.parse
 * errors, which code reads in a catch block: the runtime gives V8's texts.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

function parseError(text: Json): Json {
	try {
		JSON.parse(text);
		return null;
	} catch (e) {
		return { name: e.name, message: e.message };
	}
}

export default workflow({
	triggers: [webhook({ path: 'text' })],
	async run(ctx, trigger) {
		const body: Json = trigger.body;
		const words: Json[] = body.words;
		const forms = words.map((w: Json) => ({
			nfc: w.normalize(),
			nfd: w.normalize('NFD'),
			nfkc: w.normalize('NFKC'),
			nfkd: w.normalize('NFKD'),
		}));
		const errors = (body.json as Json[]).map((t: Json) => parseError(t));
		const sorted = [...words, 'resume', 'Resume', 'co-op', 'coop', '日本', '中文', '10', '9'].sort(
			(a: Json, b: Json) => a.localeCompare(b),
		);
		// Arguments that are not text: V8 converts them with String(), and no argument is undefined.
		const odd: Json[] = ['undefined', '10', 'null', '[object Object]', 'b'];
		const missing: Json = body.missing;
		const coerced = odd.map((w: Json) => [
			w.localeCompare(),
			w.localeCompare(missing),
			w.localeCompare(10),
			w.localeCompare(null),
			w.localeCompare({ a: 1 }),
			w.localeCompare(true),
		]);
		return { forms, errors, sorted, coerced };
	},
});
