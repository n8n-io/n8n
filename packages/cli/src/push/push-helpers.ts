import type { Request, Response } from 'express';

import type { PushRequest, PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';

export function isPushRequest(req: Request): req is PushRequest {
	return 'pushRef' in req.query && typeof req.query.pushRef === 'string';
}

export function isSSEPushRequest(req: Request): req is SSEPushRequest {
	const hasWs = 'ws' in req;
	return isPushRequest(req) && (!hasWs || req.ws === undefined);
}

export function isWebSocketPushRequest(req: Request): req is WebSocketPushRequest {
	return isPushRequest(req) && 'ws' in req && req.ws !== undefined;
}

export function isPushResponse(res: Response): res is PushResponse {
	return 'req' in res && isPushRequest(res.req);
}
