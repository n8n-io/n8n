import { describe, expect, it } from 'vitest';

import { decodeUtf8, toWellFormed } from '../utf8';

// Node Buffer keeps a leading byte order mark, so the reference must keep it too.
const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true });

// Bytes at the edges of each UTF-8 lead and continuation range.
const EDGE_BYTES = [
	0x00, 0x41, 0x7f, 0x80, 0x8f, 0x90, 0x9f, 0xa0, 0xbb, 0xbf, 0xc0, 0xc1, 0xc2, 0xdf, 0xe0, 0xed,
	0xef, 0xf0, 0xf4, 0xf5, 0xff,
];

const combinations = (length: number): number[][] =>
	length === 0
		? [[]]
		: combinations(length - 1).flatMap((prefix) => EDGE_BYTES.map((byte) => [...prefix, byte]));

describe('toWellFormed', () => {
	it.each([
		['\uD800', '\uFFFD'],
		['\uDC00', '\uFFFD'],
		['a\uD83Db', 'a\uFFFDb'],
		['\uDE00\uD83D', '\uFFFD\uFFFD'],
		['😀', '😀'],
		['é😀', 'é😀'],
		['', ''],
	])('replaces each lone surrogate in %j with U+FFFD', (input, expected) => {
		expect(toWellFormed(input)).toBe(expected);
	});
});

describe('decodeUtf8', () => {
	it('decodes every one-byte and two-byte input like TextDecoder', () => {
		for (let first = 0; first <= 0xff; first++) {
			const single = Uint8Array.of(first);
			expect(decodeUtf8(single)).toBe(textDecoder.decode(single));
			for (let second = 0; second <= 0xff; second++) {
				const pair = Uint8Array.of(first, second);
				expect(decodeUtf8(pair)).toBe(textDecoder.decode(pair));
			}
		}
	});

	it('decodes every four-byte combination of edge bytes like TextDecoder', () => {
		for (const bytes of combinations(4)) {
			const input = Uint8Array.from(bytes);
			expect(decodeUtf8(input)).toBe(textDecoder.decode(input));
		}
	});

	it('keeps a leading byte order mark, like Node Buffer', () => {
		const bytes = Uint8Array.of(0xef, 0xbb, 0xbf, 0x68, 0x69);
		expect(decodeUtf8(bytes)).toBe(Buffer.from(bytes).toString('utf8'));
		expect(decodeUtf8(bytes)).toBe('\uFEFFhi');
	});

	it('decodes valid text with characters of every UTF-8 length', () => {
		const text = 'a é € 😀 \u{10FFFF}';
		expect(decodeUtf8(new TextEncoder().encode(text))).toBe(text);
	});

	it('decodes an input larger than one code point chunk', () => {
		const text = '😀'.repeat(20_000);
		expect(decodeUtf8(new TextEncoder().encode(text))).toBe(text);
	});
});
