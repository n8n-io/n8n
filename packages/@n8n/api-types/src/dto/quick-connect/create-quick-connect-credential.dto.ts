import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateQuickConnectCredentialDto extends Z.class({
	credentialType: z.string().min(1).max(128),
	projectId: z.string().optional(),
}) {}
