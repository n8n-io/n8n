import { toNodeType } from '@n8n/node-sdk';

import { sendGmailMessage } from './gmail/message.send';

export class GmailMessageSend extends toNodeType(sendGmailMessage) {}
