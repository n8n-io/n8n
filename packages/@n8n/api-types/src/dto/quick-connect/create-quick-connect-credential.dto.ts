import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateQuickConnectCredentialDto extends Z.class({
	quickConnectType: z.string().min(1).max(128),
}) {}
