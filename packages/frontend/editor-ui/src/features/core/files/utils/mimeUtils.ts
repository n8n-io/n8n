import type { IconName } from '@n8n/design-system';

const SPREADSHEET_MIME_TYPES = [
	'text/csv',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.oasis.opendocument.spreadsheet',
];

/**
 * Maps a mime type to an icon from the design-system icon set.
 * Spreadsheets are matched before the text/audio/video/image prefix families
 * so `text/csv` gets the table icon rather than the generic text one.
 */
export function getMimeFamilyIcon(mimeType: string): IconName {
	const normalized = mimeType.toLowerCase();
	if (SPREADSHEET_MIME_TYPES.includes(normalized)) return 'table';
	if (normalized.startsWith('image/')) return 'image';
	if (normalized.startsWith('audio/')) return 'volume-2';
	if (normalized.startsWith('video/')) return 'video';
	if (normalized.startsWith('text/') || normalized === 'application/json') return 'file-text';
	return 'file';
}

/** Top-level mime family, e.g. 'image' for 'image/png' — used for telemetry. */
export function getMimeFamily(mimeType: string): string {
	return mimeType.split('/')[0] || 'other';
}

/** Short human-readable type label, e.g. 'CSV' for 'text/csv'. */
export function getShortMimeLabel(mimeType: string): string {
	const normalized = mimeType.toLowerCase();
	const knownLabels: Record<string, string> = {
		'text/csv': 'CSV',
		'application/json': 'JSON',
		'application/pdf': 'PDF',
		'application/zip': 'ZIP',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
		'application/vnd.ms-excel': 'XLS',
		'text/plain': 'TXT',
		'text/html': 'HTML',
		'text/markdown': 'MD',
		'image/svg+xml': 'SVG',
	};
	if (knownLabels[normalized]) return knownLabels[normalized];
	const subtype = normalized.split('/')[1] ?? '';
	// e.g. 'image/png' → 'PNG', 'audio/mpeg' → 'MPEG'
	const simple = subtype.split('+')[0].split('.').pop() ?? '';
	return simple ? simple.toUpperCase() : normalized.toUpperCase();
}

const MB = 1024 * 1024;

/** Coarse size bucket for telemetry. */
export function getSizeBucket(sizeBytes: number): '<1mb' | '1-10mb' | '10-50mb' | '>50mb' {
	if (sizeBytes < MB) return '<1mb';
	if (sizeBytes < 10 * MB) return '1-10mb';
	if (sizeBytes <= 50 * MB) return '10-50mb';
	return '>50mb';
}
