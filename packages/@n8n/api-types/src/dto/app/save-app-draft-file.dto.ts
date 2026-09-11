import { z } from 'zod';

import { Z } from '../../zod-class';

// No size cap here beyond the request body itself: the global JSON payload
// limit (GlobalConfig.endpoints.payloadSizeMax, 16MiB by default) already
// bounds this, the same as every other JSON body in this controller.
export class SaveAppDraftFileDto extends Z.class({
	content: z.string(),
	/** Thread whose sandbox holds the draft; the file is written there so the dev server shows it. */
	threadId: z.string().min(1).max(64).optional(),
}) {}
