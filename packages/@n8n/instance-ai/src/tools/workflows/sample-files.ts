/**
 * Valid sample files for verification fixtures, so the builder never writes
 * file bytes by hand. Each file is generated deterministically, has a
 * realistic size, and passes format checks such as decoders and parsers.
 */
import { isRecord } from '@n8n/utils/is-record';
import type { BinaryFileType, IBinaryData, IDataObject } from 'n8n-workflow';
import { crc32, deflateSync } from 'node:zlib';

/** Marker for a JSON value that must become base64 file data. */
export const SAMPLE_FILE_MARKER_KEY = '$sampleFile';
/** Item key that maps binary property names to the MIME types of their sample files. */
export const SAMPLE_BINARY_KEY = '$binary';

export interface SampleFile extends IBinaryData {
	data: string;
	mimeType: string;
	fileName: string;
	fileExtension: string;
	fileType: BinaryFileType;
	/** Display size, in the format that n8n shows for stored files. */
	fileSize: string;
	bytes: number;
}

// ── PNG ─────────────────────────────────────────────────────────────────────

const PNG_SIZE = 96;

function pngChunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, crc]);
}

/** Noise pixels from a fixed seed: they do not compress, so the file has a photo-like size. */
function pngScanlines(size: number): Buffer {
	const rowLength = 1 + size * 3;
	const raw = Buffer.alloc(rowLength * size);
	let seed = 0x2f6b;
	for (let i = 0; i < raw.length; i++) {
		if (i % rowLength === 0) continue; // filter type 0
		seed = (seed * 1103515245 + 12345) >>> 0;
		raw[i] = seed >>> 24;
	}
	return raw;
}

function createPng(): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(PNG_SIZE, 0);
	header.writeUInt32BE(PNG_SIZE, 4);
	header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		pngChunk('IHDR', header),
		pngChunk('IDAT', deflateSync(pngScanlines(PNG_SIZE))),
		pngChunk('IEND', Buffer.alloc(0)),
	]);
}

// ── JPEG ────────────────────────────────────────────────────────────────────

const JPEG_WIDTH = 1920;
const JPEG_HEIGHT = 1080;

function jpegSegment(marker: number, payload: number[]): Buffer {
	const length = payload.length + 2;
	return Buffer.from([0xff, marker, length >> 8, length & 0xff, ...payload]);
}

/** A Huffman table with one 1-bit code, for symbol 0 (DC "no change" or AC "end of block"). */
function singleCodeHuffmanTable(tableClass: number): number[] {
	return [tableClass << 4, 1, ...new Array<number>(15).fill(0), 0];
}

/**
 * A mid-gray baseline JPEG. Every 8x8 block has only zero coefficients, so
 * each block costs two zero bits and the scan never needs byte stuffing.
 */
function createJpeg(): Buffer {
	const blocks = (JPEG_WIDTH / 8) * (JPEG_HEIGHT / 8);
	const size = [JPEG_HEIGHT >> 8, JPEG_HEIGHT & 0xff, JPEG_WIDTH >> 8, JPEG_WIDTH & 0xff];
	return Buffer.concat([
		Buffer.from([0xff, 0xd8]),
		jpegSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
		jpegSegment(0xdb, [0, ...new Array<number>(64).fill(1)]),
		jpegSegment(0xc0, [8, ...size, 1, 1, 0x11, 0]),
		jpegSegment(0xc4, singleCodeHuffmanTable(0)),
		jpegSegment(0xc4, singleCodeHuffmanTable(1)),
		jpegSegment(0xda, [1, 1, 0, 0, 63, 0]),
		Buffer.alloc(Math.ceil((blocks * 2) / 8)),
		Buffer.from([0xff, 0xd9]),
	]);
}

// ── MP3 ─────────────────────────────────────────────────────────────────────

/** MPEG-1 Layer III, 128 kbit/s, 44.1 kHz, mono: 144 * 128000 / 44100 = 417 bytes. */
const MP3_FRAME_HEADER = [0xff, 0xfb, 0x90, 0xc4];
const MP3_FRAME_SIZE = 417;
const MP3_FRAME_COUNT = 80; // about 2 seconds

/** Silent frames: zero side information means no audio data in each frame. */
function createMp3(): Buffer {
	const frame = Buffer.alloc(MP3_FRAME_SIZE);
	frame.set(MP3_FRAME_HEADER);
	return Buffer.concat(new Array<Buffer>(MP3_FRAME_COUNT).fill(frame));
}

// ── PDF ─────────────────────────────────────────────────────────────────────

const PDF_LINE_COUNT = 90;

function pdfContentStream(): string {
	const lines = Array.from(
		{ length: PDF_LINE_COUNT },
		(_, i) =>
			`(Sample document, line ${i + 1}. This file is placeholder content for a workflow test run.) Tj T*`,
	);
	return ['BT', '/F1 7 Tf', '8 TL', '40 760 Td', ...lines, 'ET'].join('\n');
}

/** A one-page text PDF with a correct cross-reference table. */
function createPdf(): Buffer {
	const content = pdfContentStream();
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
		`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
	];
	let pdf = '%PDF-1.4\n';
	const offsets = objects.map((body, i) => {
		const offset = Buffer.byteLength(pdf);
		pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
		return offset;
	});
	const xrefOffset = Buffer.byteLength(pdf);
	const entries = offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`);
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries.join('')}`;
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
	return Buffer.from(pdf, 'latin1');
}

// ── Registry ────────────────────────────────────────────────────────────────

export const SAMPLE_FILE_MIME_TYPES = [
	'image/png',
	'image/jpeg',
	'audio/mpeg',
	'application/pdf',
] as const;

type SampleMimeType = (typeof SAMPLE_FILE_MIME_TYPES)[number];

const GENERATORS: Record<
	SampleMimeType,
	{ extension: string; fileType: BinaryFileType; create: () => Buffer }
> = {
	'image/png': { extension: 'png', fileType: 'image', create: createPng },
	'image/jpeg': { extension: 'jpg', fileType: 'image', create: createJpeg },
	'audio/mpeg': { extension: 'mp3', fileType: 'audio', create: createMp3 },
	'application/pdf': { extension: 'pdf', fileType: 'pdf', create: createPdf },
};

const cache = new Map<SampleMimeType, SampleFile>();

function isSampleMimeType(value: string): value is SampleMimeType {
	return Object.hasOwn(GENERATORS, value);
}

/** A valid sample file for the MIME type, or undefined when the type has no sample. */
export function createSampleFile(mimeType: string): SampleFile | undefined {
	const normalized = mimeType.split(';')[0].trim().toLowerCase();
	if (!isSampleMimeType(normalized)) return undefined;
	const cached = cache.get(normalized);
	if (cached) return { ...cached };
	const { extension, fileType, create } = GENERATORS[normalized];
	const bytes = create();
	const file: SampleFile = {
		data: bytes.toString('base64'),
		mimeType: normalized,
		fileName: `sample.${extension}`,
		fileExtension: extension,
		fileType,
		fileSize: `${Number((bytes.length / 1000).toPrecision(3))} kB`,
		bytes: bytes.length,
	};
	cache.set(normalized, file);
	return { ...file };
}

// ── Fixture markers ─────────────────────────────────────────────────────────

function sampleDataForMarker(value: Record<string, unknown>): string | undefined {
	const keys = Object.keys(value);
	const mimeType = value[SAMPLE_FILE_MARKER_KEY];
	if (keys.length !== 1 || typeof mimeType !== 'string') return undefined;
	return createSampleFile(mimeType)?.data;
}

function replaceMarkers(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(replaceMarkers);
	if (!isRecord(value)) return value;
	const sample = sampleDataForMarker(value);
	if (sample !== undefined) return sample;
	return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, replaceMarkers(v)]));
}

/** Split a `$binary` spec into sample files and the entries that have no sample. */
function buildBinary(spec: unknown): {
	binary?: Record<string, SampleFile>;
	unsupported?: Record<string, unknown>;
} {
	if (!isRecord(spec))
		return spec === undefined ? {} : { unsupported: { [SAMPLE_BINARY_KEY]: spec } };
	const binary: Record<string, SampleFile> = {};
	const unsupported: Record<string, unknown> = {};
	for (const [property, mimeType] of Object.entries(spec)) {
		const file = typeof mimeType === 'string' ? createSampleFile(mimeType) : undefined;
		if (file) binary[property] = file;
		else unsupported[property] = mimeType;
	}
	return {
		binary: Object.keys(binary).length > 0 ? binary : undefined,
		unsupported:
			Object.keys(unsupported).length > 0 ? { [SAMPLE_BINARY_KEY]: unsupported } : undefined,
	};
}

/**
 * Turn one SDK fixture item into a runtime item. `{ $sampleFile: '<mime>' }`
 * becomes base64 file data, and `$binary: { <property>: '<mime>' }` becomes
 * binary properties. Unsupported MIME types stay in the item as they are,
 * including unsupported `$binary` entries.
 */
export function resolveSampleFileMarkers(item: unknown): {
	json: IDataObject;
	binary?: Record<string, SampleFile>;
} {
	if (!isRecord(item)) return { json: {} };
	const { [SAMPLE_BINARY_KEY]: binarySpec, ...rest } = item;
	const { binary, unsupported } = buildBinary(binarySpec);
	const json = { ...(replaceMarkers(rest) as IDataObject), ...unsupported } as IDataObject;
	return binary ? { json, binary } : { json };
}
