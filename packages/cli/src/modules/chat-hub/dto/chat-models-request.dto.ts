import { z } from 'zod';
import { Z } from 'zod-class';

export class ChatModelsRequestDto extends Z.class({
	credentialId: z.string().optional(),
}) {}
