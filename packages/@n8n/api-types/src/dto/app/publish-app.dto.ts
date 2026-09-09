import { z } from 'zod';

import { Z } from '../../zod-class';

export class PublishAppDto extends Z.class({
	/** Thread whose sandbox holds the draft; its current edits are snapshotted before the build. */
	threadId: z.string().min(1).max(64).optional(),
}) {}
