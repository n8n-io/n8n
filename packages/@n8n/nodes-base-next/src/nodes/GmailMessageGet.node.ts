import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GmailMessageGet extends toVersionedNodeType(versionsOf('gmail.message.get')) {}
