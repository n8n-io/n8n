import '../../openapi-extend';

import { publishIfActiveOpenApi } from './workflow-public.openapi';
import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

// Defaults to true so existing integrations keep publishing on save.
export class UpdateWorkflowQueryDto extends Z.class({
	publishIfActive: booleanFromString.optional().default('true').openapi(publishIfActiveOpenApi),
}) {}
