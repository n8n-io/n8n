import { z } from 'zod';

import { readOnlyPublicFieldErrorMap, workflowWritePublicShape } from './base-workflow-public.dto';
import { Z } from '../../zod-class';

export class CreateWorkflowPublicDto extends Z.class(
	{
		...workflowWritePublicShape,
		projectId: z.string().optional(),
	},
	{ strict: true, errorMap: readOnlyPublicFieldErrorMap },
) {}
