import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class GetWorkflowQueryDto extends Z.class({
	excludePinnedData: booleanFromString.optional().default('false'),
}) {}
