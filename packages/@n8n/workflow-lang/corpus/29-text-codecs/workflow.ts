/**
 * The text codecs of the library: base64 of UTF-8 text and back, URI
 * components, escape and unescape, and the errors of bad input.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

function caught(f: () => string): string {
	try {
		return f();
	} catch (error) {
		const e = error as { name: string; message: string };
		return `${e.name}: ${e.message}`;
	}
}

export default workflow({
	triggers: [webhook<{ text: string; b64: string }>({ path: 'codecs' })],
	async run(_ctx, trigger) {
		const text = trigger.body.text;
		const encoded = btoa(unescape(encodeURIComponent(text)));
		return {
			encoded,
			back: decodeURIComponent(escape(atob(encoded))),
			b64: atob(trigger.body.b64),
			uri: encodeURIComponent(`${text} &=/?#`),
			uriBack: decodeURIComponent('a%20b%2Fc%C3%BC'),
			escaped: escape(text),
			unescaped: unescape('%u00FC%FC%u20AC'),
			urlSafe: btoa('subjects?_>').replaceAll('+', '-').replaceAll('/', '_'),
			errors: [
				caught(() => btoa('€')),
				caught(() => atob('abcde')),
				caught(() => decodeURIComponent('%E0%A4%A')),
			],
		};
	},
});
