import { z } from 'zod';

import { Z } from '../../zod-class';

export class GetQuickConnectApiKeyDto extends Z.class({
	quickConnectType: z.string().min(1).max(128),
}) {}
