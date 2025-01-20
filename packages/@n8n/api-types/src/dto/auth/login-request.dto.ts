import { z } from 'zod';
import { Z } from 'zod-class';

export class LoginRequestDto extends Z.class({
	email: z.string().email(),
	password: z.string().min(1),
	mfaCode: z.string().optional(),
	mfaRecoveryCode: z.string().optional(),
}) {}
