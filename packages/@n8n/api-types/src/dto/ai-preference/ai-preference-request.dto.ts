import { z } from 'zod';

import {
	aiPreferenceContentSchema,
	aiPreferenceScopeSchema,
} from '../../schemas/ai-preference.schema';
import { Z } from '../../zod-class';

/** Body for create and update. The service checks `projectId` and `userId` against `scope`. */
export class AiPreferenceRequestDto extends Z.class({
	content: aiPreferenceContentSchema,
	scope: aiPreferenceScopeSchema,
	projectId: z.string().max(36).nullish(),
	userId: z.string().uuid().nullish(),
}) {}
