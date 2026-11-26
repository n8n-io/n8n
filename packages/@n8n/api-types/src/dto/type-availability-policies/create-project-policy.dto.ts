import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Request body of `POST /project-policies`. It gives a team project its own policy for each kind
 * that has none, so a project never ends up with only half a policy.
 */
export class CreateProjectPolicyDto extends Z.class({
	projectId: z.string().min(1),
}) {}
