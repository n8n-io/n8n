import { z } from 'zod';

import { Z } from '../../zod-class';

export const projectFileConflictModeSchema = z.enum(['replace', 'keepBoth', 'error']);

export type ProjectFileConflictMode = z.infer<typeof projectFileConflictModeSchema>;

export class UploadProjectFileQueryDto extends Z.class({
	/** How to behave when a file with the uploaded name already exists in the project. */
	conflict: projectFileConflictModeSchema.default('error'),
}) {}
