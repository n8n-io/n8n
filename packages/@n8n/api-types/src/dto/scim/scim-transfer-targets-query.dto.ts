import { z } from 'zod';

import { scimTransferTargetTypeSchema } from '../../schemas/scim-config.schema';
import { Z } from '../../zod-class';
import {
	createTakeValidator,
	MAX_ITEMS_PER_PAGE,
	paginationSchema,
} from '../pagination/pagination.dto';

/** The page size when the request has no `take`. */
export const SCIM_TRANSFER_TARGETS_DEFAULT_TAKE = 50;

/**
 * Query of `GET /rest/scim/transfer-targets`.
 *
 * `skip` and `take` apply to each section separately. To load more of one
 * section, send `type` with the next `skip`.
 */
export class ScimTransferTargetsQueryDto extends Z.class({
	/** Matches people by first name, last name, full name or email, and projects by name. */
	search: z
		.string()
		.trim()
		// No project name, full name or email is longer.
		.max(255)
		.optional()
		.transform((value) => value || undefined),
	/** Returns only this section. Without `type`, the response has both sections. */
	type: scimTransferTargetTypeSchema.optional(),
	skip: paginationSchema.skip,
	take: createTakeValidator(MAX_ITEMS_PER_PAGE, false, SCIM_TRANSFER_TARGETS_DEFAULT_TAKE),
}) {}
