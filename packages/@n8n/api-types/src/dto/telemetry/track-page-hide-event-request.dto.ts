import { z } from 'zod';

import { Z } from '../../zod-class';

export class TrackPageHideEventRequestDto extends Z.class({
	event: z.string().trim().min(1).max(255),
	properties: z.record(z.unknown()),
}) {}
