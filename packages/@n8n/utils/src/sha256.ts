/** Return a SHA-256 digest as lowercase hex. Supports HTTP browser contexts. */
export async function sha256(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const subtle = globalThis.crypto?.subtle;
	if (subtle) {
		const hashBuffer = await subtle.digest('SHA-256', data);
		return Array.from(new Uint8Array(hashBuffer), (byte) =>
			byte.toString(16).padStart(2, '0'),
		).join('');
	}

	const { default: jsSHA } = await import('jssha');
	const hash = new jsSHA('SHA-256', 'UINT8ARRAY');
	hash.update(data);
	return hash.getHash('HEX').toLowerCase();
}
