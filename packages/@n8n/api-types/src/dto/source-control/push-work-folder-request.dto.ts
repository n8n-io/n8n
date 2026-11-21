import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

export class PushWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
	/** Pushes files that differ from the remote. Does not force the git push. */
	acceptConflicts: z.boolean().optional(),
	commitMessage: z.string().optional(),
	fileNames: z.array(SourceControlledFileSchema),
}) {}

/** `meta.reason` of the 409 error when the remote has commits the instance has not pulled. */
export const SOURCE_CONTROL_PUSH_REMOTE_AHEAD_REASON = 'remote-ahead';
