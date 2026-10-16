import { z } from 'zod';

import {
	automationMapAnnotationsSchema,
	automationMapScopeSchema,
} from '../../schemas/automation-map.schema';
import { Z } from '../../zod-class';

export class UpdateAutomationMapDto extends Z.class({
	name: z.string().trim().min(1).max(128).optional(),
	scope: automationMapScopeSchema.optional(),
	annotations: automationMapAnnotationsSchema.optional(),
}) {}
