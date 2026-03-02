import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExportProjectsRequestDto extends Z.class({
	projectIds: z.array(z.string().trim().min(1)).min(1),
}) {}
