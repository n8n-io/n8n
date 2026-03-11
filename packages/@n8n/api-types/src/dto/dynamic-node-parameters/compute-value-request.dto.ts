import { z } from 'zod';

import { BaseDynamicParametersRequestDto } from './base-dynamic-parameters-request.dto';

export class ComputeValueRequestDto extends BaseDynamicParametersRequestDto.extend({
	methodName: z.string(),
}) {}
