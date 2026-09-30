import { toVersionedNodeType } from '@n8n/node-sdk';

import { versionsOf } from '../registry';

export class HttpRequestSend extends toVersionedNodeType(versionsOf('httpRequest.send')) {}
