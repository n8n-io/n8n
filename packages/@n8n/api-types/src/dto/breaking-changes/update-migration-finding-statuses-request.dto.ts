import { z } from 'zod';

import { migrationFindingTriageStatusSchema } from '../../schemas/breaking-changes.schema';
import { Z } from '../../zod-class';

export class UpdateMigrationFindingStatusesRequestDto extends Z.class({
	workflowIds: z.array(z.string().min(1)).min(1),
	status: migrationFindingTriageStatusSchema,
}) {}
