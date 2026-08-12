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

/**
 * MIME types the project Files tab previews inline.
 *
 * A strict subset of {@link ViewableMimeTypes} — asserted by a test, so this can
 * never grant inline rendering to a type the instance-wide policy rejects.
 *
 * Narrower than that list on purpose:
 * - `application/pdf`, `text/html`, `image/svg+xml`: already excluded above
 * - `image/tiff`: only Safari renders it natively, so it would be a broken image
 *   in Chrome and Firefox
 * - `audio/*`, `video/*`: the content route pipes a stream with no
 *   `Accept-Ranges`, so there is no seeking and the browser buffers the whole
 *   file. Needs HTTP Range support first
 * - `text/css`: harmless as text, but previewing a stylesheet has no value here
 */
export const ProjectFilePreviewableMimeTypes = [
	'image/bmp',
	'image/gif',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',

	'application/json',
	'text/csv',
	'text/markdown',
	'text/plain',
];

/**
 * Whether the Files tab can preview this type.
 *
 * Membership is explicit rather than prefix-based: `text/html` sits inside the
 * `text/` prefix, so a `startsWith('text/')` rule would grant it inline
 * rendering on the n8n origin.
 */
export const isProjectFilePreviewable = (mimeType: string): boolean =>
	ProjectFilePreviewableMimeTypes.includes(mimeType.toLowerCase());
