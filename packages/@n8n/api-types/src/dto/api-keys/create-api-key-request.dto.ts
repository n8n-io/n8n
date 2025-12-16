import { z } from 'zod';

import { UpdateApiKeyRequestDto } from './update-api-key-request.dto';

const isTimeNullOrInFuture = (value: number | null) => {
	if (!value) return true;
	return value > Date.now() / 1000;
};

export class CreateApiKeyRequestDto extends UpdateApiKeyRequestDto.extend({
	expiresAt: z
		.number()
		.nullable()
		.refine(isTimeNullOrInFuture, { message: 'Expiration date must be in the future or null' }),
}) {}
