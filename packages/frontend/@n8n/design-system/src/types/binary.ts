const BINARY_METADATA_KEYS = [
	'data',
	'mimeType',
	'fileType',
	'fileName',
	'directory',
	'fileExtension',
	'fileSize',
	'id',
	'bytes',
] as const;

export type BinaryMetadata = {
	[K in (typeof BINARY_METADATA_KEYS)[number] as K extends 'mimeType' | 'id' | 'data'
		? K
		: never]: K extends 'mimeType' | 'id' | 'data' ? string : never;
} & {
	[K in Exclude<
		(typeof BINARY_METADATA_KEYS)[number],
		'mimeType' | 'id' | 'data'
	>]?: K extends 'bytes' ? number : string;
};

export const isBinary = (obj: unknown): obj is BinaryMetadata => {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

	const entry = obj as Record<string, unknown>;

	if (typeof entry.mimeType !== 'string') return false;
	if (typeof entry.id !== 'string') return false;

	for (const key of Object.keys(entry)) {
		if (key === 'mimeType' || key === 'id') continue;

		const value = entry[key];

		if (key === 'bytes') {
			if (value !== undefined && typeof value !== 'number') return false;
			continue;
		}

		if (!(BINARY_METADATA_KEYS as readonly string[]).includes(key)) return false;
		if (value !== undefined && typeof value !== 'string') return false;
	}

	return true;
};
