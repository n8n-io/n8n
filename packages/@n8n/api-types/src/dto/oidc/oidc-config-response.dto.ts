import { z } from 'zod';

import { OidcConfigDto } from './config.dto';

export class OidcConfigResponseDto extends OidcConfigDto.extend({
	configuredByEnv: z.boolean().default(false),
}) {}
