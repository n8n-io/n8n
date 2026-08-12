import { z } from 'zod';

import { Z } from '../../zod-class';

export class SyncKnowledgeSourceDto extends Z.class({
	/** Ignore the stored checkpoint and re-read the source from scratch. */
	fullResync: z.boolean().optional(),
}) {}
