import { z } from 'zod';

import { workflowWritePublicShape } from './base-workflow-public.dto';
import { workflowUpdateFieldDocs } from './workflow-public.openapi';
import { Z } from '../../zod-class';

const { projectId: _projectId, ...workflowUpdatePublicShape } = workflowWritePublicShape;

export class UpdateWorkflowPublicDto extends Z.class(
	{
		...workflowUpdatePublicShape,
		description: z.string().optional().openapi(workflowUpdateFieldDocs.description),
		parentFolderId: z
			.string()
			.nullable()
			.optional()
			.openapi(workflowUpdateFieldDocs.parentFolderId),
	},
	{ strict: true },
) {}
