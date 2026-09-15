import { z } from 'zod';

import { Z } from '../../zod-class';

export class SsoRedirectToggleDto extends Z.class({
	redirectLoginToSso: z.boolean(),
}) {}
