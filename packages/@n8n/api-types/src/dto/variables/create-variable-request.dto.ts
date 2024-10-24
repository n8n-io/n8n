import { z } from 'zod';

import { BaseVariableRequestDto } from './base';

export class CreateVariableRequestDto extends BaseVariableRequestDto.extend({
	projectId: z.string().length(36).optional().nullable().default(null),
}) {}
