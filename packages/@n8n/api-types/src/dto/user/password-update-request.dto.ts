import { z } from 'zod';
import { Z } from 'zod-class';

export class PasswordUpdateRequestDTO extends Z.class({
	currentPassword: z.string(),
	newPassword: z.string(),
	mfaCode: z.string().optional(),
}) {}
