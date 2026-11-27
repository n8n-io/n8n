import { z } from 'zod';

import { Z } from '../../zod-class';

export class BlockMcpServerUserDto extends Z.class(
	{ userId: z.string().uuid() },
	{ strict: true },
) {}
