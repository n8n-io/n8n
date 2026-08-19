import { z } from 'zod';

import { Z } from '../../zod-class';

export class ShareCredentialPublicDto extends Z.class({
	shareWithIds: z.array(z.string().min(1)),
}) {}
