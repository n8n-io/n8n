import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

import type { Middleware } from './middlewares/global.middleware';

/**
 * Final handler in a public API route tuple. `TReq` must be an `AuthenticatedRequest`
 * instantiation (including aliases like `WorkflowRequest.Create`).
 */
type PublicAPIEndpointHandler<TReq extends AuthenticatedRequest> = (
	req: TReq,
	res: Response,
) => Promise<Response>;

/**
 * A public API route: any number of middlewares (see `Middleware` in `global.middleware.ts`),
 * then a typed handler. Middleware typing is intentionally loose; the handler is what we
 * type-check strictly.
 */
export type PublicAPIEndpoint<TReq extends AuthenticatedRequest> = readonly [
	...Middleware[],
	PublicAPIEndpointHandler<TReq>,
];
