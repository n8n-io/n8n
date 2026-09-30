import { toNodeType } from '@n8n/node-sdk';

import { getGmailMessage } from './gmail/message.get';

export class GmailMessageGet extends toNodeType(getGmailMessage) {}
