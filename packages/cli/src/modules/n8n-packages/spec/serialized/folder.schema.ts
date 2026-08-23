import { z } from 'zod';

export const serializedFolderSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		// Parent relative to the exported set: a folder that roots the exported
		// forest serializes `null`; a folder whose parent is also in the package
		// keeps that parent's id, so every reference resolves in-package.
		parentFolderId: z.string().nullable(),
	})
	.strict();

export type SerializedFolder = z.infer<typeof serializedFolderSchema>;
