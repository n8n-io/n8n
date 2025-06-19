import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

export class ActionResultRequestDto extends BaseDynamicParametersRequestDto.extend({
	handler: z.string(),
	payload: z
		.union([z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>, z.string()])
		.optional(),
}) {}
