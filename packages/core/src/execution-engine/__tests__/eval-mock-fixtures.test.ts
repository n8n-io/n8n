import { fileTypeFromBuffer } from 'file-type';
import { inflateSync } from 'node:zlib';

import { buildPdfWithText, evalCanvasPng, synthesizeBinaryFixture } from '../eval-mock-fixtures';

describe('eval-mock-fixtures', () => {
	describe('synthesizeBinaryFixture', () => {
		describe('override path', () => {
			it('should return the override buffer untouched when provided', () => {
				const override = Buffer.from([0x01, 0x02, 0x03, 0x04]);
				const result = synthesizeBinaryFixture('application/pdf', 'doc.pdf', { override });
				expect(result).toBe(override);
			});

			it('should ignore sizeHint when override is provided', () => {
				const override = Buffer.from([0xff]);
				const result = synthesizeBinaryFixture('image/png', 'tiny.png', {
					override,
					sizeHint: 'large',
				});
				expect(result.length).toBe(1);
			});
		});

		describe('per-MIME magic bytes (file-type sniffing)', () => {
			// Each row: contentType → expected { mime, ext } that fileTypeFromBuffer must return.
			// Validates that the fixture lib actually round-trips through prepareBinaryData's
			// detector (binary-helper-functions.ts:303) so downstream nodes derive the right
			// fileType / fileExtension.
			const cases: Array<{ contentType: string; expect: { mime: string; ext: string } }> = [
				{ contentType: 'image/png', expect: { mime: 'image/png', ext: 'png' } },
				{ contentType: 'image/jpeg', expect: { mime: 'image/jpeg', ext: 'jpg' } },
				{ contentType: 'image/gif', expect: { mime: 'image/gif', ext: 'gif' } },
				{ contentType: 'image/webp', expect: { mime: 'image/webp', ext: 'webp' } },
				{ contentType: 'application/pdf', expect: { mime: 'application/pdf', ext: 'pdf' } },
				{ contentType: 'application/zip', expect: { mime: 'application/zip', ext: 'zip' } },
				{ contentType: 'application/gzip', expect: { mime: 'application/gzip', ext: 'gz' } },
				{ contentType: 'audio/mpeg', expect: { mime: 'audio/mpeg', ext: 'mp3' } },
				{ contentType: 'audio/wav', expect: { mime: 'audio/wav', ext: 'wav' } },
				{ contentType: 'audio/ogg', expect: { mime: 'audio/ogg; codecs=opus', ext: 'opus' } },
				{ contentType: 'video/mp4', expect: { mime: 'video/mp4', ext: 'mp4' } },
			];

			it.each(cases)(
				'should produce a $contentType fixture that file-type sniffs as $expect.mime',
				async ({ contentType, expect: expected }) => {
					const buf = synthesizeBinaryFixture(contentType, `sample.${expected.ext}`);
					const sniffed = await fileTypeFromBuffer(buf);
					expect(sniffed).toBeDefined();
					expect(sniffed?.mime).toBe(expected.mime);
					expect(sniffed?.ext).toBe(expected.ext);
				},
			);

			it('should embed the filename inside SVG fixtures', () => {
				const buf = synthesizeBinaryFixture('image/svg+xml', 'diagram.svg');
				const text = buf.toString('utf8');
				expect(text).toContain('<svg');
				expect(text).toContain('diagram.svg');
			});
		});

		describe('text fixtures', () => {
			it('should produce JSON plaintext with the filename embedded', () => {
				const buf = synthesizeBinaryFixture('application/json', 'data.json');
				expect(buf.toString('utf8')).toBe('{"filename":"data.json","mock":true}\n');
			});

			it('should produce CSV plaintext seeded by the filename', () => {
				const buf = synthesizeBinaryFixture('text/csv', 'rows.csv');
				expect(buf.toString('utf8')).toBe('id,name\n1,rows.csv\n');
			});

			it('should fall back to a generic plaintext stub for unknown text/* MIMEs', () => {
				const buf = synthesizeBinaryFixture('text/markdown', 'notes.md');
				expect(buf.toString('utf8')).toBe('mock file: notes.md\n');
			});
		});

		describe('octet-stream fallback', () => {
			it('should produce deterministic bytes for application/octet-stream', () => {
				const a = synthesizeBinaryFixture('application/octet-stream', 'blob.dat');
				const b = synthesizeBinaryFixture('application/octet-stream', 'blob.dat');
				expect(a.equals(b)).toBe(true);
				expect(a.length).toBeGreaterThanOrEqual(256);
			});

			it('should produce different bytes for different filenames', () => {
				const a = synthesizeBinaryFixture('application/octet-stream', 'first.dat');
				const b = synthesizeBinaryFixture('application/octet-stream', 'second.dat');
				expect(a.equals(b)).toBe(false);
			});

			it('should fall back to octet-stream for unknown application/* MIMEs', () => {
				const buf = synthesizeBinaryFixture('application/x-binary-frobnicator', 'thing.bin');
				expect(buf.length).toBeGreaterThanOrEqual(256);
			});
		});

		describe('determinism', () => {
			it('should produce byte-identical output for repeated calls with the same input', () => {
				const a = synthesizeBinaryFixture('application/pdf', 'doc.pdf');
				const b = synthesizeBinaryFixture('application/pdf', 'doc.pdf');
				expect(a.equals(b)).toBe(true);
			});

			it('should ignore content-type charset suffix when picking the fixture', () => {
				const withCharset = synthesizeBinaryFixture('application/json; charset=utf-8', 'a.json');
				const plain = synthesizeBinaryFixture('application/json', 'a.json');
				expect(withCharset.equals(plain)).toBe(true);
			});

			it('should treat content-type case-insensitively', () => {
				const upper = synthesizeBinaryFixture('IMAGE/PNG', 'a.png');
				const lower = synthesizeBinaryFixture('image/png', 'a.png');
				expect(upper.equals(lower)).toBe(true);
			});
		});

		describe('sizeHint', () => {
			it('should keep the fixture at minimum size for sizeHint=small', () => {
				const small = synthesizeBinaryFixture('image/png', 'a.png', { sizeHint: 'small' });
				const noHint = synthesizeBinaryFixture('image/png', 'a.png');
				expect(small.equals(noHint)).toBe(true);
			});

			it('should pad PDF tails for sizeHint=medium without breaking mime-sniff', async () => {
				const buf = synthesizeBinaryFixture('application/pdf', 'big.pdf', { sizeHint: 'medium' });
				expect(buf.length).toBeGreaterThanOrEqual(64 * 1024);
				const sniffed = await fileTypeFromBuffer(buf);
				expect(sniffed?.mime).toBe('application/pdf');
			});

			it('should pad image/png tails for sizeHint=large without breaking mime-sniff', async () => {
				const buf = synthesizeBinaryFixture('image/png', 'big.png', { sizeHint: 'large' });
				expect(buf.length).toBeGreaterThanOrEqual(1024 * 1024);
				const sniffed = await fileTypeFromBuffer(buf);
				expect(sniffed?.mime).toBe('image/png');
			});

			it('should NOT pad ZIP fixtures (EOCD-from-end would break)', () => {
				const small = synthesizeBinaryFixture('application/zip', 'a.zip', { sizeHint: 'small' });
				const large = synthesizeBinaryFixture('application/zip', 'a.zip', { sizeHint: 'large' });
				expect(small.equals(large)).toBe(true);
			});

			it('should NOT pad video/mp4 fixtures', () => {
				const small = synthesizeBinaryFixture('video/mp4', 'a.mp4', { sizeHint: 'small' });
				const large = synthesizeBinaryFixture('video/mp4', 'a.mp4', { sizeHint: 'large' });
				expect(small.equals(large)).toBe(true);
			});

			it('should grow octet-stream fallback up to the size target', () => {
				const buf = synthesizeBinaryFixture('application/octet-stream', 'big.dat', {
					sizeHint: 'medium',
				});
				expect(buf.length).toBeGreaterThanOrEqual(64 * 1024);
			});

			it('should pad JSON text fixtures so JSON.parse still accepts the buffer at medium size', () => {
				const buf = synthesizeBinaryFixture('application/json', 'data.json', {
					sizeHint: 'medium',
				});
				expect(buf.length).toBeGreaterThanOrEqual(64 * 1024);
				const parsed = JSON.parse(buf.toString('utf8')) as { filename: string; mock: boolean };
				expect(parsed).toEqual({ filename: 'data.json', mock: true });
			});

			it('should pad CSV text fixtures with whitespace (no embedded control bytes)', () => {
				const buf = synthesizeBinaryFixture('text/csv', 'rows.csv', { sizeHint: 'large' });
				expect(buf.length).toBeGreaterThanOrEqual(1024 * 1024);
				// First lines stay parseable; padding contains no non-printable bytes.
				const text = buf.toString('utf8');
				expect(text.startsWith('id,name\n1,rows.csv\n')).toBe(true);
				const padTail = text.slice('id,name\n1,rows.csv\n'.length);
				expect(padTail).toMatch(/^ *$/);
			});

			it('should pad XML text fixtures so a well-formed XML parser tolerates the buffer', () => {
				const buf = synthesizeBinaryFixture('application/xml', 'doc.xml', { sizeHint: 'medium' });
				const text = buf.toString('utf8');
				expect(text.startsWith('<?xml version="1.0"?>\n<file name="doc.xml"/>\n')).toBe(true);
				// Padding is whitespace only — preserves XML well-formedness.
				const padTail = text.slice('<?xml version="1.0"?>\n<file name="doc.xml"/>\n'.length);
				expect(padTail).toMatch(/^[\s]*$/);
			});

			it('should pad arbitrary text/* MIMEs (text/markdown) with whitespace', () => {
				const buf = synthesizeBinaryFixture('text/markdown', 'notes.md', { sizeHint: 'medium' });
				const text = buf.toString('utf8');
				expect(text.startsWith('mock file: notes.md\n')).toBe(true);
				expect(text.slice('mock file: notes.md\n'.length)).toMatch(/^ *$/);
			});
		});

		describe('content-type defaults', () => {
			it('should default to octet-stream when content-type is empty', () => {
				const buf = synthesizeBinaryFixture('', 'thing.dat');
				expect(buf.length).toBeGreaterThanOrEqual(256);
			});

			it('should treat OOXML formats as ZIP for now', async () => {
				const buf = synthesizeBinaryFixture(
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'doc.docx',
				);
				const sniffed = await fileTypeFromBuffer(buf);
				expect(sniffed?.mime).toBe('application/zip');
			});
		});
	});

	describe('evalCanvasPng', () => {
		it('produces a sniffable 512×512 PNG with a full pixel raster', async () => {
			const png = evalCanvasPng();
			expect((await fileTypeFromBuffer(png))?.mime).toBe('image/png');
			// IHDR width/height sit at fixed offsets after the 8-byte signature.
			expect(png.readUInt32BE(16)).toBe(512);
			expect(png.readUInt32BE(20)).toBe(512);
			// IDAT payload inflates to 512 scanlines of (filter byte + 512 px).
			const idatOffset = png.indexOf('IDAT');
			const idatLength = png.readUInt32BE(idatOffset - 4);
			const raster = inflateSync(png.subarray(idatOffset + 4, idatOffset + 4 + idatLength));
			expect(raster.length).toBe(512 * 513);
		});

		it('returns the cached buffer on repeat calls', () => {
			expect(evalCanvasPng()).toBe(evalCanvasPng());
		});
	});

	describe('buildPdfWithText', () => {
		it('embeds each line as an escaped text run in a %PDF...%%EOF document', () => {
			const pdf = buildPdfWithText('Line one\nTotal (net) 50% \\ done').toString('latin1');
			expect(pdf.startsWith('%PDF-1.4')).toBe(true);
			expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
			expect(pdf).toContain('(Line one) Tj');
			expect(pdf).toContain('(Total \\(net\\) 50% \\\\ done) Tj');
		});

		it('computes xref offsets that point at the object headers', () => {
			const pdf = buildPdfWithText('anything').toString('latin1');
			const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
			expect(offsets).toHaveLength(5);
			offsets.forEach((offset, index) => {
				expect(pdf.slice(offset, offset + `${String(index + 1)} 0 obj`.length)).toBe(
					`${String(index + 1)} 0 obj`,
				);
			});
			const startxref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
			expect(pdf.slice(startxref, startxref + 4)).toBe('xref');
		});

		it('replaces non-ASCII characters and skips blank lines', () => {
			const pdf = buildPdfWithText('café £100\n\n  \nnext').toString('latin1');
			expect(pdf).toContain('(caf? ?100) Tj');
			expect(pdf).toContain('(next) Tj');
		});

		it('falls back to a stub line for empty text', () => {
			expect(buildPdfWithText(' \n \n').toString('latin1')).toContain('(Mock PDF document) Tj');
		});
	});
});
