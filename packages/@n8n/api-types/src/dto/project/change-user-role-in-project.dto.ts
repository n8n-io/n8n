import { Z } from 'zod-class';

import { projectRoleSchema } from '../../schemas/project.schema';

export class ChangeUserRoleInProject extends Z.class({
	role: projectRoleSchema.exclude(['project:personalOwner']),
}) {}
