import { crc32, inflateSync } from 'node:zlib';

import {
	SAMPLE_FILE_MIME_TYPES,
	createSampleFile,
	resolveSampleFileMarkers,
} from '../sample-files';

/** Smallest size that image and file checks in built workflows have treated as real. */
const MIN_REALISTIC_BYTES = 8 * 1024;

function bytesOf(mimeType: string): Buffer {
	const file = createSampleFile(mimeType);
	if (!file) throw new Error(`No sample for ${mimeType}`);
	return Buffer.from(file.data, 'base64');
}

function readPngChunks(png: Buffer) {
	const chunks: Array<{ type: string; data: Buffer; crcValid: boolean }> = [];
	let offset = 8;
	while (offset < png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.subarray(offset + 4, offset + 8).toString('ascii');
		const data = png.subarray(offset + 8, offset + 8 + length);
		const crc = png.readUInt32BE(offset + 8 + length);
		chunks.push({
			type,
			data,
			crcValid: crc === crc32(png.subarray(offset + 4, offset + 8 + length)),
		});
		offset += 12 + length;
	}
	return chunks;
}

function readJpegSegments(jpeg: Buffer) {
	const markers: number[] = [];
	let offset = 2;
	while (offset < jpeg.length) {
		expect(jpeg[offset]).toBe(0xff);
		const marker = jpeg[offset + 1];
		markers.push(marker);
		const length = jpeg.readUInt16BE(offset + 2);
		if (marker === 0xda) return { markers, scanStart: offset + 2 + length };
		offset += 2 + length;
	}
	return { markers, scanStart: -1 };
}

describe('createSampleFile', () => {
	it('supports images, audio and PDF', () => {
		expect(SAMPLE_FILE_MIME_TYPES).toEqual(
			expect.arrayContaining(['image/png', 'image/jpeg', 'audio/mpeg', 'application/pdf']),
		);
	});

	it.each(SAMPLE_FILE_MIME_TYPES)('returns a %s file of a realistic size', (mimeType) => {
		const file = createSampleFile(mimeType);

		expect(file).toMatchObject({ mimeType });
		expect(file?.fileName).toMatch(new RegExp(`\\.${file?.fileExtension}$`));
		expect(file?.bytes).toBe(Buffer.from(file?.data ?? '', 'base64').length);
		expect(file?.bytes).toBeGreaterThanOrEqual(MIN_REALISTIC_BYTES);
		expect(file?.fileSize).toMatch(/^\d+(\.\d+)? kB$/);
	});

	it('returns the same bytes on every call', () => {
		expect(createSampleFile('image/png')?.data).toBe(createSampleFile('image/png')?.data);
	});

	it('returns undefined for an unsupported MIME type', () => {
		expect(createSampleFile('video/quicktime')).toBeUndefined();
	});

	it('accepts a MIME type with parameters and mixed case', () => {
		expect(createSampleFile('Image/PNG; charset=binary')?.mimeType).toBe('image/png');
	});

	it('produces a decodable PNG', () => {
		const png = bytesOf('image/png');
		expect(png.subarray(0, 8)).toEqual(
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		);

		const chunks = readPngChunks(png);
		expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
		expect(chunks.every((c) => c.crcValid)).toBe(true);

		const header = chunks[0].data;
		const width = header.readUInt32BE(0);
		const height = header.readUInt32BE(4);
		// 8-bit RGB: one filter byte plus three bytes for each pixel in each row.
		expect(inflateSync(chunks[1].data).length).toBe(height * (1 + width * 3));
	});

	it('produces a baseline JPEG with a frame, Huffman tables and a scan', () => {
		const jpeg = bytesOf('image/jpeg');
		expect(jpeg.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
		expect(jpeg.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));

		const { markers, scanStart } = readJpegSegments(jpeg);
		expect(markers).toEqual(expect.arrayContaining([0xe0, 0xdb, 0xc0, 0xc4, 0xda]));

		// Entropy-coded data: every 0xFF byte must be stuffed with 0x00.
		const scan = jpeg.subarray(scanStart, -2);
		for (let i = 0; i < scan.length; i++) {
			if (scan[i] === 0xff) expect(scan[i + 1]).toBe(0x00);
		}
	});

	it('produces MP3 data that starts on a frame boundary and repeats whole frames', () => {
		const mp3 = bytesOf('audio/mpeg');
		// MPEG-1 Layer III, 128 kbit/s, 44.1 kHz: 417-byte frames.
		const frameSize = 417;

		expect(mp3.length % frameSize).toBe(0);
		for (let offset = 0; offset < mp3.length; offset += frameSize) {
			expect(mp3[offset]).toBe(0xff);
			expect(mp3[offset + 1] & 0xe0).toBe(0xe0);
		}
	});

	it('produces a PDF that a PDF parser can read', async () => {
		const { PDFParse } = await import('pdf-parse');
		const parser = new PDFParse({ data: bytesOf('application/pdf') });
		try {
			const { text, total } = await parser.getText();
			expect(total).toBe(1);
			expect(text.length).toBeGreaterThan(0);
		} finally {
			await parser.destroy();
		}
	});
});

describe('resolveSampleFileMarkers', () => {
	it('replaces a $sampleFile marker in the JSON with base64 file data', () => {
		const { json } = resolveSampleFileMarkers({
			result: { image: { $sampleFile: 'image/jpeg' } },
			success: true,
		});

		expect(json).toEqual({
			result: { image: createSampleFile('image/jpeg')?.data },
			success: true,
		});
	});

	it('replaces markers inside arrays', () => {
		const { json } = resolveSampleFileMarkers({ pages: [{ $sampleFile: 'application/pdf' }] });

		expect(json).toEqual({ pages: [createSampleFile('application/pdf')?.data] });
	});

	it('turns a $binary entry into binary properties of the item', () => {
		const { json, binary } = resolveSampleFileMarkers({
			id: 'file-1',
			$binary: { data: 'image/png', audio: 'audio/mpeg' },
		});

		expect(json).toEqual({ id: 'file-1' });
		expect(binary).toEqual({
			data: createSampleFile('image/png'),
			audio: createSampleFile('audio/mpeg'),
		});
	});

	it('leaves an unsupported MIME type marker unchanged', () => {
		const item = { image: { $sampleFile: 'video/quicktime' }, $binary: { data: 'video/mp4' } };

		const { json, binary } = resolveSampleFileMarkers(item);

		expect(json).toEqual({ image: { $sampleFile: 'video/quicktime' } });
		expect(binary).toBeUndefined();
	});

	it('returns an item without markers unchanged', () => {
		const item = { name: 'Ada', tags: ['a', 'b'], nested: { count: 2 } };

		expect(resolveSampleFileMarkers(item)).toEqual({ json: item });
	});

	it('treats a non-object item as an empty item', () => {
		expect(resolveSampleFileMarkers(null)).toEqual({ json: {} });
	});
});
