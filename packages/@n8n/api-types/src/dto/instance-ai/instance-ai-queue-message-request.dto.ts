import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiQueueMessageRequest extends Z.class({
	text: z.string().trim().min(1),
}) {}
