import { breakingChangeVersionSchema } from '../../schemas/breaking-changes.schema';
import { Z } from '../../zod-class';

export class BreakingChangeReportQueryDto extends Z.class({
	version: breakingChangeVersionSchema.optional(),
}) {}
