import { Z } from 'zod-class';

import { passwordResetTokenSchema } from '../../schemas/password-reset-token.schema';

export class ResolvePasswordTokenQueryDto extends Z.class({
	token: passwordResetTokenSchema,
}) {}
