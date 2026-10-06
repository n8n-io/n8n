import { z } from 'zod';

import { ViewableMimeTypes } from '../schemas/binary-data.schema';

export const sessionFileDtoSchema = z.object({
	id: z.string(),
	kind: z.literal('attachment'),
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	messageId: z.string().optional(),
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

export function toSessionFileDto(row: {
	id: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: Date;
	messageId?: string | null;
}): SessionFileDto {
	return {
		id: row.id,
		kind: 'attachment',
		fileName: row.fileName,
		mimeType: row.mimeType,
		sizeBytes: row.fileSizeBytes,
		...(row.messageId ? { messageId: row.messageId } : {}),
		createdAt: row.createdAt.toISOString(),
		previewable: isSessionFilePreviewable(row.mimeType),
	};
}
