import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

export class ResourceLocatorRequestDto extends BaseDynamicParametersRequestDto.extend({
	methodName: z.string(),
	filter: z.string().optional(),
	// Offset-style `listSearch` methods return a numeric token. The client sends the
	// token back unchanged, so accept a number here and convert it.
	paginationToken: z.union([z.string(), z.number()]).transform(String).optional(),
}) {}
