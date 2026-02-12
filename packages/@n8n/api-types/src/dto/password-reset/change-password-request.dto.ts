import { z } from 'zod';

import { passwordResetTokenSchema } from '../../schemas/password-reset-token.schema';
import { passwordSchema } from '../../schemas/password.schema';
import { Z } from '../../zod-class';

export class ChangePasswordRequestDto extends Z.class({
	token: passwordResetTokenSchema,
	password: passwordSchema,
	mfaCode: z.string().optional(),
}) {}
