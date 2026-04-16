import type { ILoadOptions } from 'n8n-workflow';
import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

const isRelativeOrExpressionUrl = (url: string) =>
	url.startsWith('=') || (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(url) && !url.startsWith('//'));

export class OptionsRequestDto extends BaseDynamicParametersRequestDto.extend({
	loadOptions: z
		.object({
			routing: z
				.object({
					operations: z.any().optional(),
					output: z.any().optional(),
					request: z
						.object({ url: z.string().optional() })
						.passthrough()
						.refine((req) => req?.url === undefined || isRelativeOrExpressionUrl(req.url), {
							message: 'routing.request.url must be a relative path, not an absolute URL',
						})
						.optional(),
				})
				.optional(),
		})
		.optional() as z.ZodType<ILoadOptions | undefined>,
}) {}
