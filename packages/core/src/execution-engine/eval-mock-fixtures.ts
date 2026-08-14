/**
 * Minimal-valid binary fixtures for the eval mock layer.
 *
 * Each fixture is the smallest byte sequence that `fileTypeFromBuffer`
 * recognizes as its declared MIME, so downstream node logic that derives
 * `fileExtension` / `fileType` from mime-sniffing behaves identically to a
 * real HTTP download.
 *
 * Used by:
 *  - packages/cli/src/modules/instance-ai/eval/mock-handler.ts — synthesize
 *    binary HTTP responses for file-download endpoints.
 *  - packages/cli/src/modules/instance-ai/eval/pin-data-generator.ts —
 *    supply binary input items to upload nodes that read `$binary.data`.
 */

import { deflateSync } from 'node:zlib';

export type FixtureSizeHint = 'small' | 'medium' | 'large';

export interface SynthesizeBinaryFixtureOptions {
	/** Pad the synthetic fixture for size-constrained scenarios. Default `'small'` (minimum valid size). */
	sizeHint?: FixtureSizeHint;
	/** Scenario-pinned override — when present, returned untouched (Step 4 precedence). */
	override?: Buffer;
}

// ---------------------------------------------------------------------------
// Base fixtures — minimum byte sequences that `fileTypeFromBuffer` recognizes.
// ---------------------------------------------------------------------------

/** 1×1 transparent PNG — 67 bytes. Magic: 89 50 4E 47 0D 0A 1A 0A */
const PNG_1X1 = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12P4//8/AwAI/AL+XJ/PAAAAAElFTkSuQmCC',
	'base64',
);

/** 1×1 JPEG. Magic: FF D8 FF E0 ... FF D9 */
const JPEG_1X1 = Buffer.from(
	'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+f/9k=',
	'base64',
);

/** 1×1 GIF89a — 35 bytes. */
const GIF_1X1 = Buffer.from(
	'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
	'base64',
);

/** 1×1 lossless WebP. Magic: RIFF .... WEBP VP8L */
const WEBP_1X1 = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');

/** Minimal PDF 1.4 document with one empty 3×3-unit page. ~350 bytes. */
const PDF_EMPTY = Buffer.from(
	'JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAzIDNdPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDUzIDAwMDAwIG4gCjAwMDAwMDAxMDIgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxNDkKJSVFT0Y=',
	'base64',
);

/** Empty ZIP archive — 22 bytes (just the End-of-Central-Directory record). */
const ZIP_EMPTY = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');

/** Empty gzip stream — 20 bytes. */
const GZIP_EMPTY = Buffer.from([
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00,
]);

/**
 * MPEG-1 Layer III frame — 128 kbps, 44.1 kHz, mono. 417 bytes (one full frame).
 * file-type sniffs the FF FB sync word as audio/mpeg.
 */
const MP3_FRAME = Buffer.concat([
	// Frame header: 0xFFFB9064
	//   11-bit sync 0xFFB, MPEG-1, Layer III, no CRC, 128 kbps, 44100 Hz,
	//   no padding, mono, copyright=0, original=1.
	Buffer.from([0xff, 0xfb, 0x90, 0x64]),
	// Frame body padding to the standard 417-byte size for this configuration.
	Buffer.alloc(413, 0),
]);

/** Minimal RIFF/WAVE — 16-bit mono 44.1kHz PCM, zero data samples. 44 bytes. */
const WAV_EMPTY = Buffer.from([
	0x52,
	0x49,
	0x46,
	0x46, // "RIFF"
	0x24,
	0x00,
	0x00,
	0x00, // file size − 8 = 36
	0x57,
	0x41,
	0x56,
	0x45, // "WAVE"
	0x66,
	0x6d,
	0x74,
	0x20, // "fmt "
	0x10,
	0x00,
	0x00,
	0x00, // fmt chunk size = 16
	0x01,
	0x00, // PCM
	0x01,
	0x00, // mono
	0x44,
	0xac,
	0x00,
	0x00, // 44100 Hz
	0x88,
	0x58,
	0x01,
	0x00, // byte rate
	0x02,
	0x00, // block align
	0x10,
	0x00, // 16 bits/sample
	0x64,
	0x61,
	0x74,
	0x61, // "data"
	0x00,
	0x00,
	0x00,
	0x00, // data size = 0
]);

/**
 * Minimal OGG page carrying an OpusHead identification packet — 46 bytes.
 * `file-type` recognizes OggS magic at offset 0 and "OpusHead" at offset 28
 * to return `audio/opus`. The OGG CRC32 is left zero (sniffing does not validate it).
 */
const OGG_OPUS = Buffer.from([
	// OGG page header (27 bytes)
	0x4f,
	0x67,
	0x67,
	0x53, // "OggS"
	0x00, // stream structure version
	0x02, // header type flag = BOS (beginning of stream)
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00, // granule position
	0x01,
	0x00,
	0x00,
	0x00, // bitstream serial
	0x00,
	0x00,
	0x00,
	0x00, // page sequence
	0x00,
	0x00,
	0x00,
	0x00, // CRC32 (zero — sniffing skips)
	0x01, // 1 segment
	0x13, // segment length = 19
	// OpusHead identification packet (19 bytes)
	0x4f,
	0x70,
	0x75,
	0x73,
	0x48,
	0x65,
	0x61,
	0x64, // "OpusHead"
	0x01, // version 1
	0x01, // mono
	0x00,
	0x00, // pre-skip 0
	0x80,
	0xbb,
	0x00,
	0x00, // 48000 Hz input sample rate
	0x00,
	0x00, // output gain 0
	0x00, // channel mapping family 0
]);

/** Minimal MP4 ftyp box, brand `mp42`, compatible with `isom`. 24 bytes. */
const MP4_FTYP = Buffer.from([
	0x00,
	0x00,
	0x00,
	0x18, // box size 24
	0x66,
	0x74,
	0x79,
	0x70, // "ftyp"
	0x6d,
	0x70,
	0x34,
	0x32, // major brand "mp42"
	0x00,
	0x00,
	0x00,
	0x00, // minor version
	0x6d,
	0x70,
	0x34,
	0x32, // compat brand "mp42"
	0x69,
	0x73,
	0x6f,
	0x6d, // compat brand "isom"
]);

// ---------------------------------------------------------------------------
// Drawable canvas PNG + text-bearing PDF — for content the workflow PROCESSES
// (Edit Image, Extract PDF Text), where a magic-bytes-only fixture crashes the
// real decoder downstream.
// ---------------------------------------------------------------------------

/** CRC32 over a PNG chunk's type+data — bitwise, no lookup table needed here. */
function pngCrc32(buf: Buffer): number {
	let crc = 0xffffffff;
	for (const byte of buf) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(pngCrc32(typeAndData));
	return Buffer.concat([length, typeAndData, crc]);
}

const CANVAS_PNG_SIZE = 512;
let canvasPngCache: Buffer | undefined;

/**
 * 512×512 opaque white PNG (8-bit grayscale), built programmatically so it is
 * always structurally valid. Unlike `PNG_1X1`, this gives image-PROCESSING
 * nodes (Edit Image text overlay, resize, composite via GraphicsMagick) a real
 * canvas to operate on — a 1×1 or truncated placeholder makes them fail with
 * "Insufficient image data".
 */
export function evalCanvasPng(): Buffer {
	if (canvasPngCache) return canvasPngCache;
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(CANVAS_PNG_SIZE, 0);
	ihdr.writeUInt32BE(CANVAS_PNG_SIZE, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 0; // color type: grayscale (bytes 10-12: compression/filter/interlace = 0)
	// Each scanline: 1 filter byte (0 = None) + 512 white pixels.
	const scanlines = Buffer.alloc(CANVAS_PNG_SIZE * (CANVAS_PNG_SIZE + 1), 0xff);
	for (let y = 0; y < CANVAS_PNG_SIZE; y++) scanlines[y * (CANVAS_PNG_SIZE + 1)] = 0;
	canvasPngCache = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', deflateSync(scanlines)),
		pngChunk('IEND', Buffer.alloc(0)),
	]);
	return canvasPngCache;
}

const PDF_TEXT_MAX_LINES = 40;

/**
 * Build a valid one-page PDF whose extractable text is `text` (ASCII-printable
 * subset; other characters become `?`). The xref offsets are computed, so
 * strict parsers (pdfjs-dist behind Extract From File) accept it — LLM-authored
 * "PDF bytes" never parse, so mock layers substitute these and keep the
 * scenario's document CONTENT model-authored as plaintext.
 */
export function buildPdfWithText(text: string): Buffer {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.replace(/[^\x20-\x7e]/g, '?').trimEnd())
		.filter((line) => line.length > 0)
		.slice(0, PDF_TEXT_MAX_LINES);
	if (lines.length === 0) lines.push('Mock PDF document');

	const escapePdfString = (value: string) =>
		value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
	const contentParts = ['BT', '/F1 12 Tf', '14 TL', '50 780 Td'];
	lines.forEach((line, index) => {
		if (index > 0) contentParts.push('T*');
		contentParts.push(`(${escapePdfString(line)}) Tj`);
	});
	contentParts.push('ET');
	const contentStream = contentParts.join('\n');

	const objects = [
		'<</Type/Catalog/Pages 2 0 R>>',
		'<</Type/Pages/Kids[3 0 R]/Count 1>>',
		'<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
		'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
		`<</Length ${String(Buffer.byteLength(contentStream, 'latin1'))}>>\nstream\n${contentStream}\nendstream`,
	];

	let pdf = '%PDF-1.4\n';
	const offsets: number[] = [];
	objects.forEach((object, index) => {
		offsets.push(Buffer.byteLength(pdf, 'latin1'));
		pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
	});
	const xrefStart = Buffer.byteLength(pdf, 'latin1');
	pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
	for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
	pdf += `trailer\n<</Size ${String(objects.length + 1)}/Root 1 0 R>>\nstartxref\n${String(xrefStart)}\n%%EOF\n`;
	return Buffer.from(pdf, 'latin1');
}

// ---------------------------------------------------------------------------
// MIME → fixture map
// ---------------------------------------------------------------------------

/**
 * Match a base MIME (no parameters, lowercased) to its fixture. Returns
 * `undefined` for unmatched MIMEs so the caller can fall back to the
 * deterministic-random octet-stream path.
 */
function pickBinaryFixture(mime: string, filename: string): Buffer | undefined {
	if (mime === 'image/png') return PNG_1X1;
	if (mime === 'image/jpeg' || mime === 'image/jpg') return JPEG_1X1;
	if (mime === 'image/gif') return GIF_1X1;
	if (mime === 'image/webp') return WEBP_1X1;
	if (mime === 'image/svg+xml') return svgFixture(filename);
	if (mime === 'application/pdf') return PDF_EMPTY;
	if (mime === 'application/gzip' || mime === 'application/x-gzip') return GZIP_EMPTY;
	if (mime === 'audio/mpeg' || mime === 'audio/mp3') return MP3_FRAME;
	if (mime === 'audio/wav' || mime === 'audio/wave' || mime === 'audio/x-wav') return WAV_EMPTY;
	if (mime === 'audio/ogg' || mime === 'audio/opus' || mime === 'application/ogg') {
		return OGG_OPUS;
	}
	if (mime === 'video/mp4' || mime === 'audio/mp4' || mime === 'application/mp4') return MP4_FTYP;

	// OOXML and other ZIP-based formats mime-sniff as `application/zip` for now —
	// acceptable for the eval mock layer since the structural decoder downstream
	// is what matters.
	if (
		mime === 'application/zip' ||
		mime === 'application/epub+zip' ||
		mime.startsWith('application/vnd.openxmlformats-') ||
		mime === 'application/vnd.ms-excel' ||
		mime === 'application/vnd.ms-powerpoint' ||
		mime === 'application/msword'
	) {
		return ZIP_EMPTY;
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Text + fallback synthesis
// ---------------------------------------------------------------------------

const TEXT_MIMES = new Set([
	'text/plain',
	'text/csv',
	'text/html',
	'text/xml',
	'application/json',
	'application/xml',
	'application/yaml',
	'application/x-yaml',
	'text/yaml',
]);

function svgFixture(filename: string): Buffer {
	const safe = filename.replace(/[^\w.\- ]/g, '');
	return Buffer.from(
		`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><!-- ${safe} --></svg>\n`,
		'utf8',
	);
}

function textFixture(mime: string, filename: string): Buffer {
	if (mime === 'application/json') {
		return Buffer.from(`{"filename":"${filename}","mock":true}\n`, 'utf8');
	}
	if (mime === 'text/csv') {
		return Buffer.from(`id,name\n1,${filename}\n`, 'utf8');
	}
	if (mime === 'text/html') {
		return Buffer.from(`<!doctype html><title>${filename}</title>\n`, 'utf8');
	}
	if (mime === 'application/xml' || mime === 'text/xml') {
		return Buffer.from(`<?xml version="1.0"?>\n<file name="${filename}"/>\n`, 'utf8');
	}
	if (mime === 'application/yaml' || mime === 'application/x-yaml' || mime === 'text/yaml') {
		return Buffer.from(`filename: ${filename}\nmock: true\n`, 'utf8');
	}
	return Buffer.from(`mock file: ${filename}\n`, 'utf8');
}

/**
 * Deterministic pseudo-random bytes keyed by the filename so the same
 * `(filename, length)` always produces the same buffer. Uses an xmur3-style
 * seed mix plus an xorshift PRNG — no crypto-grade guarantees, just stable
 * output for fixture-equality assertions.
 */
function deterministicBytes(seed: string, length: number): Buffer {
	let h = 1779033703 ^ seed.length;
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	const buf = Buffer.alloc(length);
	let state = h >>> 0;
	for (let i = 0; i < length; i++) {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		state >>>= 0;
		buf[i] = state & 0xff;
	}
	return buf;
}

// ---------------------------------------------------------------------------
// Size-hint padding
// ---------------------------------------------------------------------------

const SIZE_TARGETS: Record<FixtureSizeHint, number> = {
	small: 0,
	medium: 64 * 1024,
	large: 1024 * 1024,
};

/**
 * Formats where the magic bytes / structural footer are at fixed offsets
 * relative to the end of the buffer (ZIP EOCD, MP4 boxes). Padding these
 * breaks downstream decoders, so we leave them at minimum size regardless of
 * sizeHint.
 */
const NO_PAD_MIMES = new Set([
	'application/zip',
	'application/epub+zip',
	'application/vnd.ms-excel',
	'application/vnd.ms-powerpoint',
	'application/msword',
	'video/mp4',
	'audio/mp4',
	'application/mp4',
]);

function isOoxml(mime: string): boolean {
	return mime.startsWith('application/vnd.openxmlformats-');
}

function isTextMime(mime: string): boolean {
	return TEXT_MIMES.has(mime) || mime.startsWith('text/');
}

function applySizeHint(base: Buffer, hint: FixtureSizeHint, mime: string): Buffer {
	if (hint === 'small') return base;
	if (NO_PAD_MIMES.has(mime) || isOoxml(mime)) return base;
	const target = SIZE_TARGETS[hint];
	if (base.length >= target) return base;

	if (isTextMime(mime)) {
		// Pad text fixtures with ASCII space so the buffer stays parseable at
		// medium/large sizes. JSON.parse, XML/HTML parsers, and CSV consumers
		// all tolerate trailing whitespace; random-byte padding would corrupt
		// them at the first non-whitespace byte after the document end.
		return Buffer.concat([base, Buffer.alloc(target - base.length, 0x20)]);
	}

	// PDF / PNG / JPEG / WAV / OGG / GIF tolerate trailing bytes (decoders
	// stop at their own EOF marker). Deterministic seed keeps the bytes
	// reproducible across runs.
	return Buffer.concat([base, deterministicBytes(`pad:${mime}`, target - base.length)]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synthesize a minimal-valid binary buffer for the given content type.
 *
 * Precedence:
 *  1. `options.override` — scenario-pinned bytes returned untouched.
 *  2. MIME-keyed minimal fixture (PDF, PNG, OGG, …).
 *  3. Text MIME plaintext stub seeded with `filename`.
 *  4. Deterministic-random 256-byte payload (octet-stream fallback).
 *
 * `options.sizeHint` only pads the tail of MIMEs whose decoder tolerates
 * trailing bytes (everything except ZIP-based formats and MP4).
 */
export function synthesizeBinaryFixture(
	contentType: string,
	filename: string,
	options: SynthesizeBinaryFixtureOptions = {},
): Buffer {
	if (options.override) return options.override;

	const mime = (contentType || 'application/octet-stream').toLowerCase().split(';')[0].trim();
	const hint: FixtureSizeHint = options.sizeHint ?? 'small';

	const binary = pickBinaryFixture(mime, filename);
	if (binary) return applySizeHint(binary, hint, mime);

	if (isTextMime(mime)) {
		return applySizeHint(textFixture(mime, filename), hint, mime);
	}

	return deterministicBytes(filename, Math.max(256, SIZE_TARGETS[hint] || 256));
}
