import { z } from 'zod';

import {
	snippetCodeSchema,
	snippetDescriptionSchema,
	snippetNameSchema,
	snippetTestsSchema,
} from './base.dto';
import { Z } from '../../zod-class';

export class UpdateSnippetRequestDto extends Z.class({
	name: snippetNameSchema.optional(),
	code: snippetCodeSchema.optional(),
	description: snippetDescriptionSchema.nullable().optional(),
	tests: snippetTestsSchema.nullable().optional(),
	projectId: z.string().max(36).optional().nullable(),
}) {}
