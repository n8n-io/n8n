import { z } from 'zod';

import { Z } from '../../zod-class';

/** The major of an action whose versions the editor lists, e.g. `?major=3`. */
export class NextNodeActionVersionsQueryDto extends Z.class({
	major: z.coerce.number().int().nonnegative(),
}) {}
