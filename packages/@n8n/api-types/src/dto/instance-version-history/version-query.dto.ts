import { z } from 'zod';

import { Z } from '../../zod-class';

export class VersionQueryDto extends Z.class({
	major: z.coerce.number().int().nonnegative(),
	minor: z.coerce.number().int().nonnegative(),
	patch: z.coerce.number().int().nonnegative(),
}) {}
