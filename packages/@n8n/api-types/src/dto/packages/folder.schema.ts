import { z } from 'zod';

export const serializedFolderSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		// `null` when the parent folder is not in the package. Otherwise the
		// parent's id, so that every parent id points to a folder in the package.
		parentFolderId: z.string().nullable(),
	})
	.strict();

export type SerializedFolder = z.infer<typeof serializedFolderSchema>;
