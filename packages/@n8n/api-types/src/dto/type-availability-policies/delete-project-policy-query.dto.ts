import { z } from 'zod';

import { Z } from '../../zod-class';

// A query string carries text, and a kind with no policy is read at version 0.
const versionSchema = z.coerce.number().int().nonnegative();

/**
 * Query of `DELETE /project-policies/:projectId`. It carries the version of each kind that the
 * caller last read, so the delete fails if either kind changed since then.
 */
export class DeleteProjectPolicyQueryDto extends Z.class({
	nodeTypesVersion: versionSchema,
	credentialTypesVersion: versionSchema,
}) {}
