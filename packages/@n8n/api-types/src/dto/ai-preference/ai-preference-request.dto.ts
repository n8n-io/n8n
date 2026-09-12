import { z } from 'zod';

import {
	aiPreferenceContentSchema,
	aiPreferenceScopeSchema,
} from '../../schemas/ai-preference.schema';
import { Z } from '../../zod-class';

/**
 * Body for both create and update: the editor always submits the whole preference,
 * so an update states its scope again rather than patching one field.
 *
 * `projectId` is required when `scope` is `project` and refused otherwise. That
 * rule lives in the service, because a refinement would stop the schema from being
 * a plain object, which the controller registry needs.
 */
export class AiPreferenceRequestDto extends Z.class({
	content: aiPreferenceContentSchema,
	scope: aiPreferenceScopeSchema,
	projectId: z.string().max(36).nullish(),
}) {}
