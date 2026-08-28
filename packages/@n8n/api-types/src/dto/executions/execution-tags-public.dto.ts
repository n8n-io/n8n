import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

// A distinct class from `WorkflowTagsPublicDto` over the same item shape: a response DTO reused by
// two routes is hoisted into a shared OpenAPI component named after the class, and the executions
// paths must not `$ref` a component called `workflowTagsPublicDto`.
export class ExecutionTagsPublicDto extends Z.array(tagPublicSchema) {}
