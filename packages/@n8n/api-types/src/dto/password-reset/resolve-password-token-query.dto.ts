import { passwordResetTokenSchema } from '../../schemas/password-reset-token.schema';
import { Z } from '../../zod-class';

export class ResolvePasswordTokenQueryDto extends Z.class({
	token: passwordResetTokenSchema,
}) {}
