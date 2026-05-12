import { z } from 'zod';

import { Z } from '../../zod-class';

export class PasswordlessVerifyRequestDto extends Z.class({
	response: z.any(),
}) {}
