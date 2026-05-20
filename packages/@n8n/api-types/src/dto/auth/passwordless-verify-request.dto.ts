import { z } from 'zod';

import { Z } from '../../zod-class';

export class PasswordlessVerifyRequestDto extends Z.class({
	challengeId: z.string().uuid(),
	response: z.any(),
}) {}
