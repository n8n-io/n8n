import { uuDecode } from './uudecode';

describe('uuDecode', () => {
	it('decodes a single-line body to the original bytes', () => {
		// "Hello, world!" uuencoded body line: length char `-` (32+13) followed by 20 chars
		const body = "-2&5L;&\\L('=O<FQD(0``";
		expect(uuDecode(body).toString()).toBe('Hello, world!');
	});

	it('decodes a body extracted from a full uuencode block', () => {
		const block = Buffer.from(
			'YmVnaW4gNjQ0IGRhdGEKLTImNUw7JlxMKCc9TzxGUUQoMGBgCmAKZW5kCg==',
			'base64',
		).toString('binary');
		const parts = block.split('\n');
		const merged = parts.splice(1, parts.length - 4).join('');
		expect(uuDecode(merged).toString()).toBe('Hello, world!');
	});

	it('decodes a multi-line body whose lines have been concatenated', () => {
		const original = 'A'.repeat(45) + 'B'.repeat(13);
		// Line 1: 45 bytes -> 'M' + 60 encoded chars
		// Line 2: 13 bytes -> '-' + 20 encoded chars
		const merged = encodeFull(Buffer.from(original));
		expect(uuDecode(merged).toString()).toBe(original);
	});

	it('stops at a zero-length terminator', () => {
		const data = encodeFull(Buffer.from('hello'));
		const withTerminator = data + ' trailing-garbage';
		expect(uuDecode(withTerminator).toString()).toBe('hello');
	});

	it('returns an empty buffer for empty input', () => {
		expect(uuDecode('').length).toBe(0);
	});

	it('accepts a Buffer input', () => {
		const buf = Buffer.from("-2&5L;&\\L('=O<FQD(0``", 'binary');
		expect(uuDecode(buf).toString()).toBe('Hello, world!');
	});

	it('treats backtick as zero (space substitution)', () => {
		// Single byte 0x00 -> length '!' (32+1) + 4 backticks
		const encoded = '!````';
		const result = uuDecode(encoded);
		expect(result.length).toBe(1);
		expect(result[0]).toBe(0);
	});
});

function encodeFull(buf: Buffer): string {
	let out = '';
	for (let offset = 0; offset < buf.length; offset += 45) {
		const chunk = buf.subarray(offset, Math.min(offset + 45, buf.length));
		out += String.fromCharCode(chunk.length + 0x20);
		for (let i = 0; i < chunk.length; i += 3) {
			const b0 = chunk[i];
			const b1 = i + 1 < chunk.length ? chunk[i + 1] : 0;
			const b2 = i + 2 < chunk.length ? chunk[i + 2] : 0;
			const c0 = (b0 >> 2) & 0x3f;
			const c1 = ((b0 << 4) | (b1 >> 4)) & 0x3f;
			const c2 = ((b1 << 2) | (b2 >> 6)) & 0x3f;
			const c3 = b2 & 0x3f;
			out += encChar(c0) + encChar(c1) + encChar(c2) + encChar(c3);
		}
	}
	return out;
}

function encChar(n: number): string {
	return String.fromCharCode(n === 0 ? 0x60 : n + 0x20);
}
