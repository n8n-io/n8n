import { z } from 'zod';

import { Z } from '../../zod-class';

export class SetActiveAppVersionDto extends Z.class({
	/** Version to serve at `/apps/<namespace>/`; null unpublishes the app. */
	versionId: z.string().min(1).max(64).nullable(),
}) {}
