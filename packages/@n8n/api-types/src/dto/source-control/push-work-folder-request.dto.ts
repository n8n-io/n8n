import { z } from 'zod';

import { SOURCE_CONTROL_FILE_TYPE } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

/**
 * Lightweight selector used in the `fileNames` array.
 * Only `id` and `type` are needed; all other file metadata is resolved
 * server-side from the live git status to prevent stale/forged values.
 */
const FileNameSelectorSchema = z.object({
	id: z.string(),
	type: z.enum([
		SOURCE_CONTROL_FILE_TYPE.workflow,
		SOURCE_CONTROL_FILE_TYPE.credential,
		SOURCE_CONTROL_FILE_TYPE.variables,
		SOURCE_CONTROL_FILE_TYPE.tags,
		SOURCE_CONTROL_FILE_TYPE.folders,
		SOURCE_CONTROL_FILE_TYPE.project,
		SOURCE_CONTROL_FILE_TYPE.datatable,
	]),
});

export class PushWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
	commitMessage: z.string().optional(),
	fileNames: z.array(FileNameSelectorSchema).default([]),
	ids: z.array(z.string()).optional(),
}) {}
