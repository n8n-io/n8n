import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExportPackageRequestDto extends Z.class({
	workflowIds: z.array(z.string().trim().min(1)).max(300).min(1).optional(),
	projectIds: z.array(z.string().trim().min(1)).max(300).min(1).optional(),
}) {}
