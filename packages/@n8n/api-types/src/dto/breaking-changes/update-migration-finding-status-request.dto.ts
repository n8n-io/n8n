import { migrationFindingTriageStatusSchema } from '../../schemas/breaking-changes.schema';
import { Z } from '../../zod-class';

export class UpdateMigrationFindingStatusRequestDto extends Z.class({
	status: migrationFindingTriageStatusSchema,
}) {}
