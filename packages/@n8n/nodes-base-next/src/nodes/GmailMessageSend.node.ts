import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GmailMessageSend extends toVersionedNodeType(versionsOf('gmail.message.send')) {}
