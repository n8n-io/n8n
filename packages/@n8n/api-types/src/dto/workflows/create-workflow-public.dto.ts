import { z } from 'zod';

import { workflowWritePublicShape } from './base-workflow-public.dto';
import { workflowCreateFieldDocs } from './workflow-public.openapi';
import { Z } from '../../zod-class';

export class CreateWorkflowPublicDto extends Z.class(
	{
		...workflowWritePublicShape,
		description: z.string().optional().openapi(workflowCreateFieldDocs.description),
	},
	{ strict: true },
) {}
