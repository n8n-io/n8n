import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GoogleGeminiTextMessage extends toVersionedNodeType(
	versionsOf('googleGemini.text.message'),
) {}
