import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class GetExecutionQueryDto extends Z.class({
	includeData: booleanFromString.optional().default('false'),
	ignoreDataSizeLimit: booleanFromString.optional().default('false'),
	// Tri-state: `true` redacts, `false` needs the `execution:reveal` scope, omitted follows policy.
	redactExecutionData: booleanFromString.optional(),
}) {}
