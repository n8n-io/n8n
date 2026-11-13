import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Body of `PATCH /api/v1/users/{userId}/locale`. The field is required, so an
 * empty body fails validation instead of doing nothing.
 */
export class ChangeUserLocalePublicDto extends Z.class({
	/** Personal UI locale. `null` clears it, so the instance default applies. */
	locale: z.string().min(1).nullable(),
}) {}
