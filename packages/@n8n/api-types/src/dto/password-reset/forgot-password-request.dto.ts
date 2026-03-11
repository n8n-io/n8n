import { z } from 'zod';

import { Z } from '../../zod-class';

export class ForgotPasswordRequestDto extends Z.class({
	email: z.email().max(255),
}) {}
