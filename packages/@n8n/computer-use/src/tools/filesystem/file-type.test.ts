import { detectBinaryFileType } from './file-type';

describe('detectBinaryFileType', () => {
	it.each([
		['photo.jpg', 'image', 'image/jpeg'],
		['photo.jpeg', 'image', 'image/jpeg'],
		['photo.png', 'image', 'image/png'],
		['photo.gif', 'image', 'image/gif'],
		['photo.webp', 'image', 'image/webp'],
		['song.mp3', 'audio', 'audio/mpeg'],
		['song.wav', 'audio', 'audio/wav'],
		['doc.pdf', 'pdf', 'application/pdf'],
	])('maps %s to %s/%s', (filePath, kind, mimeType) => {
		expect(detectBinaryFileType(filePath)).toEqual({ kind, mimeType });
	});

	it.each([
		'src/index.ts',
		'notes.md',
		'config.json',
		'README',
		'photo.svg', // SVG is XML — must not be classified as media
		'song.flac', // not supported by Claude/OpenAI
		'movie.mp4', // video — out of scope
		'archive.zip',
	])('returns null for unsupported file %s', (filePath) => {
		expect(detectBinaryFileType(filePath)).toBeNull();
	});

	it('returns null for paths without an extension', () => {
		expect(detectBinaryFileType('Makefile')).toBeNull();
	});

	it('resolves relative paths the same way as absolute ones', () => {
		expect(detectBinaryFileType('/abs/path/photo.png')).toEqual({
			kind: 'image',
			mimeType: 'image/png',
		});
	});
});
