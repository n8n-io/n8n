import { z } from 'zod';

import { Z } from '../../zod-class';

export class SnippetListRequestDto extends Z.class({
	projectId: z.string().max(36).optional(),
}) {}
