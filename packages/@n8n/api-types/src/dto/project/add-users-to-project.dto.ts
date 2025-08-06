import { z } from 'zod';
import { Z } from 'zod-class';

import { projectRelationSchema } from '../../schemas/project.schema';

export class AddUsersToProjectDto extends Z.class({
	relations: z.array(projectRelationSchema).min(1),
}) {}
