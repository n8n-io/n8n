import { z } from 'zod';

import { CreateApiKeyRequestDto } from './create-api-key-request.dto';

export class CreateApiKeyForUserRequestDto extends CreateApiKeyRequestDto.extend({
	userId: z.string().uuid({ message: 'User ID must be a valid UUID' }),
}) {}
