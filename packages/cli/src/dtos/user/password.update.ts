import { z } from 'zod';
import { Z } from 'zod-class';

export class PasswordUpdateDTO extends Z.class({
	currentPassword: z.string(),
	newPassword: z.string(),
}) {}
