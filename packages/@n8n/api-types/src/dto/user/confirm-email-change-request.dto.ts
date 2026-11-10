import { z } from 'zod';

import { Z } from '../../zod-class';

export class ConfirmEmailChangeRequestDto extends Z.class({
	token: z.string().min(1, 'Token is required'),
}) {}
