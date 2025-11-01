import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

export class ResourceLocatorRequestDto extends BaseDynamicParametersRequestDto.extend({
	methodName: z.string(),
	filter: z.string().optional(),
	paginationToken: z.string().optional(),
}) {}
