import { z } from 'zod';

import { Z } from '../../zod-class';

export class EnsureAppPreviewDto extends Z.class({
	threadId: z.string().min(1).max(64),
}) {}
