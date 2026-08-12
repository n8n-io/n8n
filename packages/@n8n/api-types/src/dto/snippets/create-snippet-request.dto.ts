import { z } from 'zod';

import {
	snippetCodeSchema,
	snippetDescriptionSchema,
	snippetNameSchema,
	snippetTestsSchema,
} from './base.dto';
import { Z } from '../../zod-class';

export class CreateSnippetRequestDto extends Z.class({
	name: snippetNameSchema,
	code: snippetCodeSchema,
	description: snippetDescriptionSchema.optional(),
	tests: snippetTestsSchema.optional(),
	projectId: z.string().max(36).optional(),
}) {}
