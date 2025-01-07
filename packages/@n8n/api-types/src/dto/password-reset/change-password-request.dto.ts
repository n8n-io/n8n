import { z } from 'zod';
import { Z } from 'zod-class';

import { passwordSchema } from '../../schemas/password.schema';
import { passwordResetTokenSchema } from '../../schemas/passwordResetToken.schema';

export class ChangePasswordRequestDto extends Z.class({
	token: passwordResetTokenSchema,
	password: passwordSchema,
	mfaCode: z.string().optional(),
}) {}
