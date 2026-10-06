import { z } from 'zod';

import { Z } from '../../zod-class';

export class AssignMigrationOwnerDto extends Z.class({
	userId: z.string().min(1),
}) {}
