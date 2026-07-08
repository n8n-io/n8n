import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExportPackageRequestDto extends Z.class({
	workflowIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
	folderIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
	projectIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
	subworkflowBehaviour: z.enum(['included-in-package', 'references-only']).optional(),
	externalSubworkflowBehaviour: z
		.enum(['block', 'include-top-level', 'references-only'])
		.optional(),
}) {}
