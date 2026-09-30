import { toNodeType } from '@n8n/node-sdk';

import { getRequest } from './http/request';

export class HttpRequestGet extends toNodeType(getRequest) {}
