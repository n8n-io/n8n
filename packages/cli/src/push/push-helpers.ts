import type { Request } from 'express';

import type { PushRequest } from './types';

export function isPushRequest(req: Request): req is PushRequest {
	return 'pushRef' in req.query;
}
