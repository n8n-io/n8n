import { z } from 'zod';

import { Z } from '../../zod-class';

export class PasswordResetWebAuthnOptionsRequestDto extends Z.class({
	token: z.string(),
}) {}
