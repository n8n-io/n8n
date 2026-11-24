import {
	assertOoxmlWithinBounds,
	MAX_OOXML_ENTRIES,
	MAX_OOXML_UNCOMPRESSED_BYTES,
} from '../ooxml-guard';

// ── Minimal ZIP builders ─────────────────────────────────────────────────────
// `assertOoxmlWithinBounds` only reads the central directory + EOCD, so the tests
// build just those records (no local file data) and point the EOCD at offset 0.

function centralHeader(name: string, uncompressedSize: number): Buffer {
	const nameBuf = Buffer.from(name, 'utf-8');
	const header = Buffer.alloc(46 + nameBuf.length);
	header.writeUInt32LE(0x02014b50, 0); // central file header signature
	header.writeUInt32LE(uncompressedSize >>> 0, 24); // uncompressed size
	header.writeUInt16LE(nameBuf.length, 28); // file name length
	nameBuf.copy(header, 46);
	return header;
}

function makeZip(entries: Array<{ name: string; uncompressedSize: number }>): Buffer {
	const cd = Buffer.concat(entries.map((e) => centralHeader(e.name, e.uncompressedSize)));
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
	eocd.writeUInt16LE(entries.length, 8); // entries on this disk
	eocd.writeUInt16LE(entries.length, 10); // total entries
	eocd.writeUInt32LE(cd.length, 12); // central directory size
	eocd.writeUInt32LE(0, 16); // central directory offset
	return Buffer.concat([cd, eocd]);
}

describe('assertOoxmlWithinBounds', () => {
	it('accepts a normal archive within bounds', () => {
		const zip = makeZip([
			{ name: 'word/document.xml', uncompressedSize: 50_000 },
			{ name: '[Content_Types].xml', uncompressedSize: 1_000 },
		]);
		expect(() => assertOoxmlWithinBounds(zip, 'doc.docx')).not.toThrow();
	});

	it('rejects when total declared uncompressed size exceeds the cap', () => {
		const zip = makeZip([
			{ name: 'sheet1.xml', uncompressedSize: MAX_OOXML_UNCOMPRESSED_BYTES },
			{ name: 'sheet2.xml', uncompressedSize: 1 },
		]);
		expect(() => assertOoxmlWithinBounds(zip, 'bomb.xlsx')).toThrow(/decompresses to more than/);
	});

	it('rejects when entry count exceeds the cap', () => {
		const entries = Array.from({ length: MAX_OOXML_ENTRIES + 1 }, (_, i) => ({
			name: `part${i}.xml`,
			uncompressedSize: 1,
		}));
		expect(() => assertOoxmlWithinBounds(makeZip(entries), 'bomb.xlsx')).toThrow(
			/too many archive entries/,
		);
	});

	it('rejects a ZIP64-sized entry without decoding the extra field', () => {
		const zip = makeZip([{ name: 'huge.bin', uncompressedSize: 0xffffffff }]);
		expect(() => assertOoxmlWithinBounds(zip, 'bomb.xlsx')).toThrow(/ZIP64/);
	});

	it('passes through a buffer with no central directory (downstream parser will reject)', () => {
		const notAZip = Buffer.from('this is plain text, not an archive', 'utf-8');
		expect(() => assertOoxmlWithinBounds(notAZip, 'plain.txt')).not.toThrow();
	});
});
