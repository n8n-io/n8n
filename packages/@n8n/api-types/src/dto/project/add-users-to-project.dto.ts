import { z } from 'zod';

import { projectRelationSchema } from '../../schemas/project.schema';
import { Z } from '../../zod-class';

export class AddUsersToProjectDto extends Z.class({
	relations: z.array(projectRelationSchema).min(1),
}) {}
