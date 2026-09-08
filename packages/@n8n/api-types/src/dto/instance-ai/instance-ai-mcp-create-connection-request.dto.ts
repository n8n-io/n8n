import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiMcpCreateConnectionRequestDto extends Z.class({
	serverSlug: z.string().min(1).max(255),
	credentialId: z.string().min(1).max(36),
}) {}
