import { Z } from '../../zod-class';
import { activeWorkflowVersionPublicSchema } from '../workflows/workflow-public.dto';

/**
 * A single workflow version. `autosaved` is internal, and the publish history belongs to the
 * active version rather than to an arbitrary one.
 */
export const workflowVersionPublicSchema = activeWorkflowVersionPublicSchema.omit({
	autosaved: true,
	workflowPublishHistory: true,
});

export class WorkflowVersionPublicDto extends Z.class(workflowVersionPublicSchema.shape) {}
