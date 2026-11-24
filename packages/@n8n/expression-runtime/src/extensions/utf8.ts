const REPLACEMENT_CHARACTER = 0xfffd;

// With the `u` flag, a surrogate range matches only a surrogate that is not part of a pair.
const LONE_SURROGATE = /[\uD800-\uDFFF]/gu;

// String.fromCharCode takes its input as arguments, so a large input must go in chunks.
const CODE_UNIT_CHUNK_SIZE = 8192;

/** Replaces each lone surrogate with U+FFFD, like `String.prototype.toWellFormed`. */
export function toWellFormed(value: string): string {
	return value.replace(LONE_SURROGATE, '\uFFFD');
}

interface Utf8Sequence {
	codePoint: number;
	remaining: number;
	lower: number;
	upper: number;
}

/** Starts a multi-byte UTF-8 sequence from its lead byte. Returns undefined when the byte cannot start one. */
function startSequence(lead: number): Utf8Sequence | undefined {
	if (lead >= 0xc2 && lead <= 0xdf) {
		return { codePoint: lead & 0x1f, remaining: 1, lower: 0x80, upper: 0xbf };
	}
	if (lead >= 0xe0 && lead <= 0xef) {
		const lower = lead === 0xe0 ? 0xa0 : 0x80;
		const upper = lead === 0xed ? 0x9f : 0xbf;
		return { codePoint: lead & 0x0f, remaining: 2, lower, upper };
	}
	if (lead >= 0xf0 && lead <= 0xf4) {
		const lower = lead === 0xf0 ? 0x90 : 0x80;
		const upper = lead === 0xf4 ? 0x8f : 0xbf;
		return { codePoint: lead & 0x07, remaining: 3, lower, upper };
	}
	return undefined;
}

/**
 * Collects code points as UTF-16 code units in a buffer of fixed size.
 * The capacity must be at least the number of code units to write.
 */
function createUtf16Writer(capacity: number) {
	const codeUnits = new Uint16Array(capacity);
	let length = 0;
	return {
		write(codePoint: number) {
			if (codePoint > 0xffff) {
				const offset = codePoint - 0x10000;
				codeUnits[length++] = 0xd800 + (offset >> 10);
				codeUnits[length++] = 0xdc00 + (offset & 0x3ff);
			} else {
				codeUnits[length++] = codePoint;
			}
		},
		toString() {
			let result = '';
			for (let start = 0; start < length; start += CODE_UNIT_CHUNK_SIZE) {
				const end = Math.min(start + CODE_UNIT_CHUNK_SIZE, length);
				result += String.fromCharCode(...codeUnits.subarray(start, end));
			}
			return result;
		},
	};
}

/**
 * Decodes UTF-8 bytes with the WHATWG Encoding rules, like Node
 * `Buffer.toString('utf8')`. Each maximal invalid subsequence decodes as one
 * U+FFFD, and a leading byte order mark stays in the result.
 */
export function decodeUtf8(bytes: Uint8Array): string {
	// Each byte gives at most one code unit: a 4-byte sequence gives two.
	const output = createUtf16Writer(bytes.length);
	let sequence: Utf8Sequence | undefined;
	let index = 0;
	while (index < bytes.length) {
		const byte = bytes[index];
		if (sequence === undefined) {
			index++;
			if (byte <= 0x7f) {
				output.write(byte);
			} else {
				sequence = startSequence(byte);
				if (sequence === undefined) {
					output.write(REPLACEMENT_CHARACTER);
				}
			}
		} else if (byte < sequence.lower || byte > sequence.upper) {
			// The byte is not consumed: it can start the next sequence.
			sequence = undefined;
			output.write(REPLACEMENT_CHARACTER);
		} else {
			index++;
			sequence.codePoint = (sequence.codePoint << 6) | (byte & 0x3f);
			sequence.remaining--;
			sequence.lower = 0x80;
			sequence.upper = 0xbf;
			if (sequence.remaining === 0) {
				output.write(sequence.codePoint);
				sequence = undefined;
			}
		}
	}
	if (sequence !== undefined) {
		output.write(REPLACEMENT_CHARACTER);
	}
	return output.toString();
}
