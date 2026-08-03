/**
 * Decodes a uuencoded body. The input is expected to be the body of a uuencoded
 * block (the `begin` and `end` lines stripped, body lines joined). Each line
 * starts with a length character that indicates the number of decoded bytes
 * the line carries, followed by groups of four 6-bit characters that encode
 * three bytes. The traditional space-as-zero substitution (backtick) is
 * handled by masking the offset to 6 bits.
 */
export function uuDecode(input: string | Buffer): Buffer {
	const str = typeof input === 'string' ? input : input.toString('binary');
	const out: number[] = [];
	let i = 0;

	while (i < str.length) {
		const length = (str.charCodeAt(i++) - 0x20) & 0x3f;
		if (length === 0) break;

		let written = 0;
		while (i < str.length && written < length) {
			const c0 = (str.charCodeAt(i++) - 0x20) & 0x3f;
			const c1 = i < str.length ? (str.charCodeAt(i++) - 0x20) & 0x3f : 0;
			const c2 = i < str.length ? (str.charCodeAt(i++) - 0x20) & 0x3f : 0;
			const c3 = i < str.length ? (str.charCodeAt(i++) - 0x20) & 0x3f : 0;

			if (written < length) {
				out.push(((c0 << 2) | (c1 >> 4)) & 0xff);
				written++;
			}
			if (written < length) {
				out.push(((c1 << 4) | (c2 >> 2)) & 0xff);
				written++;
			}
			if (written < length) {
				out.push(((c2 << 6) | c3) & 0xff);
				written++;
			}
		}
	}

	return Buffer.from(out);
}
