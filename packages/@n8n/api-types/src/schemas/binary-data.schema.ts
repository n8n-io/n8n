/**
 * List of MIME types that are considered safe to be viewed directly in a browser.
 *
 * Explicitly excluded from this list:
 * - 'text/html': Excluded due to high XSS risks, as HTML can execute arbitrary JavaScript
 * - 'image/svg+xml': Excluded because SVG can contain embedded JavaScript that might execute in certain contexts
 * - 'application/pdf': Excluded due to potential arbitrary code-execution vulnerabilities in PDF rendering engines
 */
export const ViewableMimeTypes = [
	'application/json',

	'audio/mpeg',
	'audio/ogg',
	'audio/wav',

	'image/bmp',
	'image/gif',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/tiff',
	'image/webp',

	'text/css',
	'text/csv',
	'text/markdown',
	'text/plain',

	'video/mp4',
	'video/ogg',
	'video/webm',
];
