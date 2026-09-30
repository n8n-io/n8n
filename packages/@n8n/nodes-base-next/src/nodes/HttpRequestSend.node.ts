import { toNodeType } from '@n8n/node-sdk';

import { sendRequest } from './http/request';

export class HttpRequestSend extends toNodeType(sendRequest) {}
