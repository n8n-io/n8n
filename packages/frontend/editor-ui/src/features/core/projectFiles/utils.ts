import type { IconName } from '@n8n/design-system';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Human-readable byte size. Sub-GB sizes round to whole units (a file listing
 * does not benefit from "1.4 MB" over "1 MB"), GB and above keep one decimal so
 * a quota line does not read "2GB of 2GB" while under the limit.
 */
export function formatBytes(bytes: number): string {
	let size = bytes;
	let unit = 0;

	while (size >= 1024 && unit < UNITS.length - 1) {
		size /= 1024;
		unit++;
	}

	const rounded = unit >= 3 ? Math.round(size * 10) / 10 : Math.round(size);

	return `${rounded} ${UNITS[unit]}`;
}

/**
 * Icon for a file, by MIME type.
 *
 * Deliberately coarse: the icon set carries no image, audio, video, table or PDF
 * glyphs, so distinguishing those types here would fall through to the same
 * default anyway.
 */
export function fileIcon(mimeType: string): IconName {
	if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'file-archive';
	if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'file-code';

	return 'file';
}
