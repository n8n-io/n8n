import { z } from 'zod';

import { Z } from '../../zod-class';

export class AgentIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
}) {}
