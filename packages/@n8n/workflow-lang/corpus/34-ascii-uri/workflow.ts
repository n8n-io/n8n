/**
 * The ASCII checks of the library (`Ascii.is`, `Ascii.isPrintable`) and
 * `encodeURI`, which keeps the reserved URI characters.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ texts: string[] }>({ path: 'ascii' })],
	async run(_ctx, trigger) {
		return trigger.body.texts.map((text) => ({
			text,
			ascii: Ascii.is(text),
			printable: Ascii.isPrintable(text),
			uri: encodeURI(`https://example.com/a b/${text}?q=1&r=[x]#frag`),
		}));
	},
});
