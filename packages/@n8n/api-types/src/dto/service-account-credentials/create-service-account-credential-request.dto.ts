import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateServiceAccountCredentialRequestDto extends Z.class({
	userId: z.string().uuid(),
	label: z.string().max(100).optional(),
	credentialType: z.string().max(100).optional(),
}) {}
