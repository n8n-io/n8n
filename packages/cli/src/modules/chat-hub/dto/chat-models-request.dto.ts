import { chatModelsRequestSchema } from '@n8n/api-types';
import { Z } from 'zod-class';

export class ChatModelsRequestDto extends Z.class(chatModelsRequestSchema.shape) {}
