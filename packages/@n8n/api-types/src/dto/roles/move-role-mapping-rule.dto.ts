import { z } from 'zod';

import { Z } from '../../zod-class';

export class MoveRoleMappingRuleDto extends Z.class({
	targetIndex: z.number().int().min(0),
}) {}
