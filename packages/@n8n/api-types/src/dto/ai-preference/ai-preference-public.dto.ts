import { z } from 'zod';

import {
	aiPreferenceScopeSchema,
	aiPreferenceSourceSchema,
} from '../../schemas/ai-preference.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';
import { AiPreferenceRequestDto } from './ai-preference-request.dto';

const aiPreferencePublicSchema = z.object({
	id: z.string(),
	content: z.string(),
	scope: aiPreferenceScopeSchema,
	userId: z.string().nullable(),
	projectId: z.string().nullable(),
	source: aiPreferenceSourceSchema,
	createdAt: z.string(),
	updatedAt: z.string(),
});

export class AiPreferencePublicDto extends Z.class(aiPreferencePublicSchema.shape) {}

export class AiPreferenceListPublicDto extends Z.class({
	data: z.array(aiPreferencePublicSchema),
	nextCursor: z.string().nullable(),
}) {}

export class ListAiPreferencesPublicQueryDto extends Z.class({
	cursor: z.string().optional(),
	limit: publicApiPaginationSchema.limit,
	scope: aiPreferenceScopeSchema.optional(),
	projectId: z.string().min(1).max(36).optional(),
}) {}

export class CreateAiPreferencePublicDto extends Z.class(AiPreferenceRequestDto.schema.shape, {
	strict: true,
}) {}

export class UpdateAiPreferencePublicDto extends CreateAiPreferencePublicDto {}
