import { z } from 'zod';

import { Z } from '../../zod-class';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Query params for `GET /credentials/:credentialId/executions` — the
 * credential-detail audit log of single-node (hub) calls.
 *
 * `limit` is capped server-side because the underlying metadata join has no
 * `(key, value)` index yet; an over-eager limit triggers a full scan of
 * `execution_metadata`.
 */
export class CredentialExecutionsRequestQuery extends Z.class({
	limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
	lastId: z.string().optional(),
}) {}
