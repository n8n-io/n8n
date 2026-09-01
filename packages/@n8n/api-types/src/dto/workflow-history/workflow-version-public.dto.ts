import { Z } from '../../zod-class';
import { activeWorkflowVersionPublicSchema } from '../workflows/workflow-public.dto';

export const workflowVersionPublicSchema = activeWorkflowVersionPublicSchema.omit({
	autosaved: true,
	workflowPublishHistory: true,
});

export class WorkflowVersionPublicDto extends Z.class(workflowVersionPublicSchema.shape) {}
