import { z } from 'zod';

import { Z } from '../../zod-class';

/** Only the fields present in the body are changed; `credentialId: null` clears it. */
export class UpdateKnowledgeSourceDto extends Z.class({
	name: z.string().min(1).max(128).optional(),
	credentialId: z.string().max(36).nullable().optional(),
	config: z.record(z.unknown()).optional(),
}) {}
