import { z } from 'zod';

import { Z } from '../../zod-class';

export class TestOidcConfigResponseDto extends Z.class({
	url: z.string().url(),
}) {}
