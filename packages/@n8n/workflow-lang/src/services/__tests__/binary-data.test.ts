import {
	BINARY_DATA_MAX_BYTES,
	decodeText,
	runBinaryDataCall,
	type BinaryDataBackend,
} from '../binary-data.ts';

const bytes = (text: string, encoding: BufferEncoding = 'utf8') => Buffer.from(text, encoding);

describe('runBinaryDataCall', () => {
	const stored: unknown[] = [];
	const backend = (detected: string | null = 'UTF-8'): BinaryDataBackend => ({
		read: async (id, limit) => (id === 'big' ? null : bytes(`${id}:${limit}`)),
		detect: () => detected,
		store: async (data, fileName, mimeType) => {
			stored.push([Buffer.from(data).toString('utf8'), fileName, mimeType]);
			return mimeType === 'none' ? null : { data: 'x', mimeType, fileName };
		},
	});
	const call = (op: string, args: Record<string, unknown>) => ({ service: 'binaryData', op, args });

	it('reads a stored file as text, with the limit of the service', async () => {
		const answer = await runBinaryDataCall(
			backend(),
			call('read', { id: 'f', as: 'text', limit: 10_000_000 }),
		);
		expect(answer).toEqual({ ok: true, result: { text: `f:${BINARY_DATA_MAX_BYTES}` } });
	});

	it('decodes inline data, and removes a byte order mark unless the option is false', async () => {
		const data = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes('héllo')]).toString(
			'base64',
		);
		const read = async (args: Record<string, unknown>) =>
			await runBinaryDataCall(backend(), call('read', { data, as: 'text', ...args }));
		expect(await read({})).toEqual({ ok: true, result: { text: 'héllo' } });
		expect(await read({ encoding: 'utf-8', stripBOM: false })).toEqual({
			ok: true,
			result: { text: '\uFEFFhéllo' },
		});
		expect(await read({ as: 'base64' })).toEqual({ ok: true, result: { data } });
	});

	it('sends the node to the host for a file or an encoding without an exact form', async () => {
		const host = (answer: unknown) =>
			(answer as { result: { host?: string } }).result.host ?? 'no host';
		expect(host(await runBinaryDataCall(backend(), call('read', { id: 'big' })))).toContain(
			'more than',
		);
		const data = bytes('héllo', 'latin1').toString('base64');
		expect(
			host(await runBinaryDataCall(backend('windows-1252'), call('read', { data, as: 'text' }))),
		).toContain('windows-1252');
		expect(host(await runBinaryDataCall(backend(null), call('read', { data })))).toContain(
			'not known',
		);
		expect(
			host(await runBinaryDataCall(backend(), call('store', { data, mimeType: 'none' }))),
		).toContain('binary data mode');
		expect(host(await runBinaryDataCall(backend(), call('other', {})))).toContain('no operation');
	});

	it('stores the bytes of base64 data as Buffer reads it', async () => {
		const answer = await runBinaryDataCall(
			backend(),
			call('store', { data: 'aG k=', fileName: 'a.txt', mimeType: 'text/plain' }),
		);
		expect(answer).toEqual({
			ok: true,
			result: { entry: { data: 'x', mimeType: 'text/plain', fileName: 'a.txt' } },
		});
		expect(stored.at(-1)).toEqual(['hi', 'a.txt', 'text/plain']);
	});
});

describe('decodeText', () => {
	it('gives ASCII bytes as they are for each encoding that keeps ASCII', () => {
		expect(decodeText(bytes('a,b\n'), 'Shift_JIS', undefined)).toBe('a,b\n');
		expect(decodeText(bytes('a,b\n'), 'ISO-8859-2', undefined)).toBe('a,b\n');
	});

	it('decodes Latin-1 and UTF-8, and no other encoding of bytes above 0x7F', () => {
		expect(decodeText(bytes('é', 'latin1'), 'ISO-8859-1', undefined)).toBe('é');
		expect(decodeText(Buffer.from([0x61, 0xff]), 'utf8', undefined)).toBe('a�');
		expect(decodeText(bytes('é', 'latin1'), 'ISO-8859-2', undefined)).toBeNull();
		expect(decodeText(bytes('a'), 'utf16le', undefined)).toBeNull();
	});
});
