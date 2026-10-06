import { z } from 'zod';

import { ViewableMimeTypes } from '../schemas/binary-data.schema';

export const MAX_SESSION_OUTPUT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_SESSION_OUTPUT_FILE_COUNT = 100;
export const MAX_SESSION_OUTPUT_PERSIST_BYTES = 500 * 1024 * 1024;

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
});

export type SessionFileDto = z.infer<typeof sessionFileDtoSchema>;

export const sessionFilesListResponseSchema = z.object({
	files: z.array(sessionFileDtoSchema),
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
	};
}

export function mergeSessionFiles(...lists: SessionFileDto[][]): SessionFileDto[] {
	return lists
		.flat()
		.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
