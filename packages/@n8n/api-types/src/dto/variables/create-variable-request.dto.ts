import { z } from 'zod';

import { BaseVariableRequestDto } from './base.dto';

export class CreateVariableRequestDto extends BaseVariableRequestDto.extend({
	projectId: z.string().max(36).optional(),
}) {}
