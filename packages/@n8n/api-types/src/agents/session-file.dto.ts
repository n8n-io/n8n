import { z } from 'zod';

import { ViewableMimeTypes } from '../schemas/binary-data.schema';

export const MAX_SESSION_OUTPUT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_SESSION_OUTPUT_FILE_COUNT = 100;
export const MAX_SESSION_OUTPUT_PERSIST_BYTES = 500 * 1024 * 1024;
export const MAX_SESSION_UPLOAD_WORKING_SET_BYTES = 200 * 1024 * 1024;

export const sessionFileKindSchema = z.enum(['attachment', 'output']);
export type SessionFileKind = z.infer<typeof sessionFileKindSchema>;

export const sessionFileDtoSchema = z.object({
	id: z.string(),
	kind: sessionFileKindSchema,
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	messageId: z.string().optional(),
	runId: z.string().optional(),
	createdAt: z.string(),
	previewable: z.boolean(),
	onDisk: z.boolean(),
});

export type SessionFileDto = z.infer<typeof sessionFileDtoSchema>;

export const manifestSkippedReasonSchema = z.enum(['working_set_cap', 'unavailable']);
export type ManifestSkippedReason = z.infer<typeof manifestSkippedReasonSchema>;

export const manifestOnDiskEntrySchema = z.object({
	id: z.string(),
	messageId: z.string(),
	fileName: z.string(),
	path: z.string(),
	sizeBytes: z.number(),
});
export type ManifestOnDiskEntry = z.infer<typeof manifestOnDiskEntrySchema>;

export const manifestSkippedEntrySchema = z.object({
	id: z.string(),
	messageId: z.string(),
	fileName: z.string(),
	sizeBytes: z.number(),
	reason: manifestSkippedReasonSchema,
});
export type ManifestSkippedEntry = z.infer<typeof manifestSkippedEntrySchema>;

export const sessionUploadsManifestSchema = z.object({
	onDisk: z.array(manifestOnDiskEntrySchema),
	skipped: z.array(manifestSkippedEntrySchema),
});
export type SessionUploadsManifest = z.infer<typeof sessionUploadsManifestSchema>;

export const sessionFilesListResponseSchema = z.object({
	files: z.array(sessionFileDtoSchema),
	workingSetSkipped: z.array(manifestSkippedEntrySchema).optional(),
});

export type SessionFilesListResponse = z.infer<typeof sessionFilesListResponseSchema>;

export function isSessionFilePreviewable(mimeType: string): boolean {
	return ViewableMimeTypes.includes(mimeType.toLowerCase());
}

export function toSessionFileDto(
	row: {
		id: string;
		fileName: string;
		mimeType: string;
		fileSizeBytes: number;
		createdAt: Date;
		messageId?: string | null;
		runId?: string | null;
	},
	kind: SessionFileKind = 'attachment',
	options: { onDisk?: boolean } = {},
): SessionFileDto {
	return {
		id: row.id,
		kind,
		fileName: row.fileName,
		mimeType: row.mimeType,
		sizeBytes: row.fileSizeBytes,
		...(row.messageId ? { messageId: row.messageId } : {}),
		...(row.runId ? { runId: row.runId } : {}),
		createdAt: row.createdAt.toISOString(),
		previewable: isSessionFilePreviewable(row.mimeType),
		onDisk: options.onDisk ?? false,
	};
}

export function mergeSessionFiles(...lists: SessionFileDto[][]): SessionFileDto[] {
	return lists
		.flat()
		.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export type WorkingSetCandidate = {
	id: string;
	messageId?: string | null;
	fileName: string;
	sizeBytes: number;
	createdAt: Date | string;
};

function createdAtMs(value: Date | string): number {
	return value instanceof Date ? value.getTime() : Date.parse(value);
}

function workingSetBaseName(fileName: string): string | null {
	const base = fileName.replaceAll('\\', '/').split('/').pop() ?? '';
	if (!base || base === '.' || base === '..') return null;
	return base.slice(0, 255);
}

function workingSetMessageDir(candidate: WorkingSetCandidate): string {
	const raw = candidate.messageId || candidate.id;
	const cleaned = raw.replaceAll('\\', '/').replaceAll('/', '-');
	if (!cleaned || cleaned === '.' || cleaned === '..') return candidate.id;
	return cleaned.slice(0, 255);
}

/**
 * Newest files first, until the Working Set cap. A file that does not fit is
 * skipped; older files that still fit stay on disk.
 */
export function selectWorkingSet(
	files: WorkingSetCandidate[],
	sessionId: string,
	capBytes: number = MAX_SESSION_UPLOAD_WORKING_SET_BYTES,
): SessionUploadsManifest {
	const ordered = [...files].sort((a, b) => {
		const delta = createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
		if (delta !== 0) return delta;
		return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
	});

	const onDisk: ManifestOnDiskEntry[] = [];
	const skipped: ManifestSkippedEntry[] = [];
	const takenPaths = new Set<string>();
	let used = 0;

	for (const file of ordered) {
		const messageId = workingSetMessageDir(file);
		const baseName = workingSetBaseName(file.fileName);
		if (!baseName) {
			skipped.push({
				id: file.id,
				messageId,
				fileName: file.fileName,
				sizeBytes: file.sizeBytes,
				reason: 'unavailable',
			});
			continue;
		}
		if (used + file.sizeBytes > capBytes) {
			skipped.push({
				id: file.id,
				messageId,
				fileName: file.fileName,
				sizeBytes: file.sizeBytes,
				reason: 'working_set_cap',
			});
			continue;
		}

		let fileName = baseName;
		let relative = `uploads/${sessionId}/${messageId}/${fileName}`;
		if (takenPaths.has(relative)) {
			fileName = `${file.id}-${baseName}`.slice(0, 255);
			relative = `uploads/${sessionId}/${messageId}/${fileName}`;
		}
		takenPaths.add(relative);
		used += file.sizeBytes;
		onDisk.push({
			id: file.id,
			messageId,
			fileName,
			path: relative,
			sizeBytes: file.sizeBytes,
		});
	}

	return { onDisk, skipped };
}
