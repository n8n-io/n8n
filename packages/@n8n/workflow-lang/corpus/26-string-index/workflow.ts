/**
 * String indexing: `charCodeAt`, `charAt` and `slice` give the same results on
 * ASCII text (the runtime's fast path) and on text with multi-byte and
 * astral characters (the scan), also over long strings in a loop.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function codes(text: string): number {
	let sum = 0;
	for (let i = 0; i < text.length; i++) sum = (sum * 31 + text.charCodeAt(i)) % 1000003;
	return sum;
}

function base64(text: string): string {
	const parts: string[] = [];
	for (let i = 0; i < text.length; i += 3) {
		const a = text.charCodeAt(i) % 256;
		const b = i + 1 < text.length ? text.charCodeAt(i + 1) % 256 : 0;
		const c = i + 2 < text.length ? text.charCodeAt(i + 2) % 256 : 0;
		parts.push(
			B64.charAt(Math.floor(a / 4)),
			B64.charAt((a % 4) * 16 + Math.floor(b / 16)),
			i + 1 < text.length ? B64.charAt((b % 16) * 4 + Math.floor(c / 64)) : '=',
			i + 2 < text.length ? B64.charAt(c % 64) : '=',
		);
	}
	return parts.join('');
}

export default workflow({
	triggers: [webhook<{ ascii: string; mixed: string }>({ path: 'strings' })],
	async run(_ctx, trigger) {
		const ascii = trigger.body.ascii.repeat(200);
		const mixed = trigger.body.mixed;
		return {
			asciiCodes: codes(ascii),
			mixedCodes: codes(mixed),
			asciiChars: [
				ascii.charAt(0),
				ascii.charAt(5),
				ascii.charAt(ascii.length - 1),
				ascii.charAt(ascii.length),
			],
			mixedChars: [
				mixed.charAt(0),
				mixed.charAt(1),
				mixed.charAt(4),
				mixed.charAt(5),
				mixed.charAt(99),
			],
			asciiSlices: [ascii.slice(3, 9), ascii.slice(-4), ascii.slice(10, 5), ascii.substring(2, 4)],
			mixedSlices: [mixed.slice(1, 4), mixed.slice(4, 6), mixed.slice(-3)],
			outOfRange: [ascii.charCodeAt(ascii.length), mixed.charCodeAt(1000)],
			b64: base64(ascii).slice(0, 40),
			b64Length: base64(ascii).length,
		};
	},
});
