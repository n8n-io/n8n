import { z } from 'zod';

import { Z } from '../../zod-class';

export class VersionSinceDateQueryDto extends Z.class({
	since: z.coerce.date(),
}) {}
