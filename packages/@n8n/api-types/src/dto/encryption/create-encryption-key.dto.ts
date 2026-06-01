import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateEncryptionKeyDto extends Z.class({
	type: z.literal('data_encryption'),
}) {}
