import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class HttpRequestGet extends toVersionedNodeType(versionsOf('httpRequest.get')) {}
