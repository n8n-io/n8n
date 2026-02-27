import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateExternalAgentMappingsDto extends Z.class({
	/** Maps remote credential type → local credential ID */
	credentialMappings: z.record(z.string().max(36)),
}) {}
