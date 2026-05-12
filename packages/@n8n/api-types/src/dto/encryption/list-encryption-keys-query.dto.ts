import { z } from 'zod';

import { Z } from '../../zod-class';

export class ListEncryptionKeysQueryDto extends Z.class({
	type: z.string().optional(),
}) {}
