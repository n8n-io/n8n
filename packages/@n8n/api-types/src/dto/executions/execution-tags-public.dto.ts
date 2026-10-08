import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

// Same shape as `WorkflowTagsPublicDto`, but a separate class on purpose: the generator names the
// shared OpenAPI component after the class, so reusing that one would point the executions paths
// at a schema called `workflowTagsPublicDto`.
export class ExecutionTagsPublicDto extends Z.array(tagPublicSchema) {}
