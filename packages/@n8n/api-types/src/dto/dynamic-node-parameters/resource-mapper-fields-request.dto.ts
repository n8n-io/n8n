import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

export class ResourceMapperFieldsRequestDto extends BaseDynamicParametersRequestDto.extend({
	methodName: z.string(),
}) {}
