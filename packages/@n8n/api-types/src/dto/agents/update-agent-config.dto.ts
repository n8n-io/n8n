import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateAgentConfigDto extends Z.class({
	config: z.record(z.unknown()),
}) {}
