import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class GetExecutionQueryDto extends Z.class({
	includeData: booleanFromString.optional().default('false'),
	ignoreDataSizeLimit: booleanFromString.optional().default('false'),
	// Tri-state on purpose: `true` always redacts, `false` requests unredacted data and needs the
	// `execution:reveal` scope, and omitted follows the workflow's redaction policy.
	redactExecutionData: booleanFromString.optional(),
}) {}
