import { z } from 'zod';

import { Z } from '../../zod-class';

export class ChangeEmailRequestDto extends Z.class({
	email: z.string().email().max(255),
	currentPassword: z.string().optional(),
	mfaCode: z.string().optional(),
}) {}
