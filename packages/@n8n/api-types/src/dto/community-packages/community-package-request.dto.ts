import { z } from 'zod';

import { Z } from '../../zod-class';

/** Body of `POST` and `PATCH /community-packages`. */
export class CommunityPackageRequestDto extends Z.class({
	name: z.string().trim().min(1),
	version: z.string().trim().min(1).optional(),
}) {}
