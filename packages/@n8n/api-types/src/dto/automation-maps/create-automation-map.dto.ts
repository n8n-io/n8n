import { z } from 'zod';

import {
	automationMapAnnotationsSchema,
	automationMapScopeSchema,
} from '../../schemas/automation-map.schema';
import { Z } from '../../zod-class';

export class CreateAutomationMapDto extends Z.class({
	name: z.string().trim().min(1).max(128),
	projectId: z.string().min(1),
	scope: automationMapScopeSchema,
	annotations: automationMapAnnotationsSchema.optional(),
}) {}
