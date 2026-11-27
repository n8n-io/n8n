const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** The 6-bit value of each base64 and base64url character. */
const SEXTETS = new Map<string, number>([
	...[...BASE64_ALPHABET].map((character, index): [string, number] => [character, index]),
	['-', 62],
	['_', 63],
]);

/**
 * Decodes base64 or base64url to bytes, like js-base64 `toUint8Array` on Node.
 * Never throws: characters outside both alphabets, padding included, are skipped,
 * and trailing bits that do not fill a byte are dropped.
 */
export function decodeBase64(value: string): Uint8Array {
	// Each character gives at most 6 bits.
	const bytes = new Uint8Array(Math.floor((value.length * 6) / 8));
	let written = 0;
	let buffer = 0;
	let bufferedBits = 0;
	for (const character of value) {
		const sextet = SEXTETS.get(character);
		if (sextet !== undefined) {
			buffer = ((buffer << 6) | sextet) & 0xffffff;
			bufferedBits += 6;
			if (bufferedBits >= 8) {
				bufferedBits -= 8;
				bytes[written++] = (buffer >> bufferedBits) & 0xff;
			}
		}
	}
	return bytes.subarray(0, written);
}
