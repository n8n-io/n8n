import { detectBinaryFileType } from './file-type';

describe('detectBinaryFileType', () => {
	it('detects PDF', () => {
		const buffer = Buffer.from('%PDF-1.7\n%...');
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'pdf', mimeType: 'application/pdf' });
	});

	it('detects JPEG (FF D8 FF)', () => {
		const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'image', mimeType: 'image/jpeg' });
	});

	it('detects PNG', () => {
		const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'image', mimeType: 'image/png' });
	});

	it.each(['GIF87a', 'GIF89a'])('detects %s', (header) => {
		const buffer = Buffer.concat([Buffer.from(header), Buffer.alloc(4)]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'image', mimeType: 'image/gif' });
	});

	it('detects WebP', () => {
		const buffer = Buffer.concat([
			Buffer.from('RIFF'),
			Buffer.from([0x00, 0x00, 0x00, 0x00]),
			Buffer.from('WEBP'),
		]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'image', mimeType: 'image/webp' });
	});

	it('detects WAV', () => {
		const buffer = Buffer.concat([
			Buffer.from('RIFF'),
			Buffer.from([0x00, 0x00, 0x00, 0x00]),
			Buffer.from('WAVE'),
		]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'audio', mimeType: 'audio/wav' });
	});

	it('detects MP3 with ID3 tag', () => {
		const buffer = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(8)]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'audio', mimeType: 'audio/mpeg' });
	});

	it('detects MP3 frame sync', () => {
		const buffer = Buffer.from([0xff, 0xfb, 0x00, 0x00]);
		expect(detectBinaryFileType(buffer)).toEqual({ kind: 'audio', mimeType: 'audio/mpeg' });
	});

	it('returns null for unsupported binary content', () => {
		const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
		expect(detectBinaryFileType(buffer)).toBeNull();
	});

	it('returns null for text content', () => {
		expect(detectBinaryFileType(Buffer.from('hello world'))).toBeNull();
	});

	it('returns null for empty buffer', () => {
		expect(detectBinaryFileType(Buffer.alloc(0))).toBeNull();
	});

	it('does not confuse RIFF without recognised payload as image or audio', () => {
		const buffer = Buffer.concat([
			Buffer.from('RIFF'),
			Buffer.from([0x00, 0x00, 0x00, 0x00]),
			Buffer.from('AVI '),
		]);
		expect(detectBinaryFileType(buffer)).toBeNull();
	});
});
