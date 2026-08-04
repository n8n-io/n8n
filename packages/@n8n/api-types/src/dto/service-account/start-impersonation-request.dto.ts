import { z } from 'zod';

import { Z } from '../../zod-class';

export class StartImpersonationRequestDto extends Z.class({
	serviceAccountId: z.string().min(1),
}) {}
