import { z } from 'zod';

const invalidFolderCharacters = /[\[\]\^\\/:*?"<>|]/;

export const folderNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.refine((name) => !invalidFolderCharacters.test(name), {
		message: 'Folder name contains invalid characters',
	});
export const folderIdSchema = z.string().max(36);
