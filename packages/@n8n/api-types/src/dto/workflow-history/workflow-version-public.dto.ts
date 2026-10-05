import { Z } from '../../zod-class';
import { activeWorkflowVersionPublicSchema } from '../workflows/workflow-public.dto';

export const workflowVersionPublicSchema = activeWorkflowVersionPublicSchema.omit({
	autosaved: true,
	workflowPublishHistory: true,
});

export class WorkflowVersionPublicDto extends Z.class(workflowVersionPublicSchema.shape) {}

// The deprecated path keeps its original contract, which required only these five fields.
export const deprecatedWorkflowVersionPublicSchema = workflowVersionPublicSchema.partial({
	nodeGroups: true,
	name: true,
	description: true,
	createdAt: true,
	updatedAt: true,
});

export class DeprecatedWorkflowVersionPublicDto extends Z.class(
	deprecatedWorkflowVersionPublicSchema.shape,
) {}
