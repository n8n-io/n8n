import { z } from 'zod';

import { Z } from '../../zod-class';

export class VerifyMessengerCodeRequestDto extends Z.class({
	code: z.string().min(1).max(64),
}) {}
