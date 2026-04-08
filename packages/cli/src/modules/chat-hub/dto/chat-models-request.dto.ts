import { chatModelsRequestSchema, Z } from '@n8n/api-types';

export class ChatModelsRequestDto extends Z.class(chatModelsRequestSchema.shape) {}
