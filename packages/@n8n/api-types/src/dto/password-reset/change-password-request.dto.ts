import { z } from 'zod';
import { Z } from 'zod-class';

import { passwordResetTokenSchema } from '../../schemas/password-reset-token.schema';
import { passwordSchema } from '../../schemas/password.schema';

export class ChangePasswordRequestDto extends Z.class({
	token: passwordResetTokenSchema,
	password: passwordSchema,
	mfaCode: z.string().optional(),
}) {}
