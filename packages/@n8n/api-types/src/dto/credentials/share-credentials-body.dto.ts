import { z } from 'zod';
import { Z } from 'zod-class';

export class ShareCredentialsBodyDto extends Z.class({
	shareWithIds: z.array(z.string()),
}) {}
