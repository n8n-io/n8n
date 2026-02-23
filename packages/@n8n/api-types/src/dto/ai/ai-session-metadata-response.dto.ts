import { z } from 'zod';
import { Z } from 'zod-class';

export class AiSessionMetadataResponseDto extends Z.class({
	hasMessages: z.boolean(),
}) {}
