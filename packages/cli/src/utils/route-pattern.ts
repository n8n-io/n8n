import { isRecord } from '@n8n/utils/is-record';
import type { Request } from 'express';

/**
 * The route pattern a request matched, with parameter names rather than values, for example
 * `/rest/workflows/:workflowId`. Express sets `req.route` before a route's own middleware
 * chain runs, so a gate registered on the route sees it. A gate that runs before any route
 * matched only has the mount path.
 */
export function getRoutePattern(req: Request): string {
	const route: unknown = req.route;
	const routePath = isRecord(route) && typeof route.path === 'string' ? route.path : '';
	return `${req.baseUrl}${routePath}` || req.path;
}
