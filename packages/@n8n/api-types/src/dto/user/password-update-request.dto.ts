import { z } from 'zod';
import { Z } from 'zod-class';

export class PasswordUpdateRequestDto extends Z.class({
	currentPassword: z.string(),
	newPassword: z.string(),
	mfaCode: z.string().optional(),
}) {}
