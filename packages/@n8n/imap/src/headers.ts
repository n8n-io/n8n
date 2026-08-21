import libmime from 'libmime';

export function parseHeaders(raw: Buffer | string): Record<string, string[]> {
	const headers = libmime.decodeHeaders(typeof raw === 'string' ? raw : raw.toString('utf8'));

	return Object.fromEntries(
		Object.entries(headers).map(([key, values]) => [
			key,
			values.map((value) => libmime.decodeWords(value)),
		]),
	);
}
