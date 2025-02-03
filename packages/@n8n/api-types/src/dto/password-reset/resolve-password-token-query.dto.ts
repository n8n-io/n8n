import { Z } from 'zod-class';

import { passwordResetTokenSchema } from '../../schemas/passwordResetToken.schema';

export class ResolvePasswordTokenQueryDto extends Z.class({
	token: passwordResetTokenSchema,
}) {}
