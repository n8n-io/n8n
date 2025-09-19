import type { ILoadOptions } from 'n8n-workflow';
import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

export class OptionsRequestDto extends BaseDynamicParametersRequestDto.extend({
	loadOptions: z
		.object({
			routing: z
				.object({
					operations: z.any().optional(),
					output: z.any().optional(),
					request: z.any().optional(),
				})
				.optional(),
		})
		.optional() as z.ZodType<ILoadOptions | undefined>,
}) {}
