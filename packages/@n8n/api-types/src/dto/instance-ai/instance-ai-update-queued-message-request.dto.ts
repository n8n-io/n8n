import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiUpdateQueuedMessageRequest extends Z.class({
	// Bounded like the composer: a queued message becomes a prompt as is.
	text: z.string().trim().min(1).max(25_000),
}) {}
