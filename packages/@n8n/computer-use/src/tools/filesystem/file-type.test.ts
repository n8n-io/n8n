import { detectSupportedBinaryFile } from './file-type';

describe('detectSupportedBinaryFile', () => {
	it.each([
		['photo.jpg', 'image', 'image/jpeg'],
		['photo.jpeg', 'image', 'image/jpeg'],
		['photo.png', 'image', 'image/png'],
		['photo.gif', 'image', 'image/gif'],
		['photo.webp', 'image', 'image/webp'],
		['doc.pdf', 'pdf', 'application/pdf'],
	])('maps %s to %s/%s', (filePath, kind, mimeType) => {
		expect(detectSupportedBinaryFile(filePath)).toEqual({ kind, mimeType });
	});

	it.each([
		'src/index.ts',
		'notes.md',
		'config.json',
		'README',
		'photo.svg', // SVG is XML — must not be classified as media
		'song.mp3', // audio — Claude does not accept audio input
		'song.wav', // audio — Claude does not accept audio input
		'song.flac', // not supported by Claude
		'movie.mp4', // video — out of scope
		'archive.zip',
	])('returns null for unsupported file %s', (filePath) => {
		expect(detectSupportedBinaryFile(filePath)).toBeNull();
	});

	it('returns null for paths without an extension', () => {
		expect(detectSupportedBinaryFile('Makefile')).toBeNull();
	});

	it('resolves relative paths the same way as absolute ones', () => {
		expect(detectSupportedBinaryFile('/abs/path/photo.png')).toEqual({
			kind: 'image',
			mimeType: 'image/png',
		});
	});
});
