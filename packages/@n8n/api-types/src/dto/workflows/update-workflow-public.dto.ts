import { workflowWritePublicShape } from './base-workflow-public.dto';
import { Z } from '../../zod-class';

export class UpdateWorkflowPublicDto extends Z.class(
	{ ...workflowWritePublicShape },
	{ strict: true },
) {}
