import { z } from 'zod';

import { Z } from '../../zod-class';

const MAX_CODE_LENGTH = 100_000; // 100 KB

export class CodeEngineRunDto extends Z.class({
	code: z.string().min(1).max(MAX_CODE_LENGTH),
	pushRef: z.string().min(1),
}) {}
