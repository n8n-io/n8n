import { toNodeType } from '@n8n/node-sdk';

import { getManyGmailMessages } from './gmail/message.get-all';

export class GmailMessageGetAll extends toNodeType(getManyGmailMessages) {}
