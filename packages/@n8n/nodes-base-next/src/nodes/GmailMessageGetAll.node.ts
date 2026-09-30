import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class GmailMessageGetAll extends toVersionedNodeType(versionsOf('gmail.message.getAll')) {}
