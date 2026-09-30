import { toNodeType } from '@n8n/node-sdk';

import { messageGemini } from './google-gemini/text.message';

export class GoogleGeminiTextMessage extends toNodeType(messageGemini) {}
