import { isRecord } from '@n8n/utils/is-record';
import type { Request } from 'express';

/**
 * Replaces every path segment that equals a request parameter value with the parameter's name,
 * so a path never carries a resolved id.
 */
function withParamNames(path: string, params: Record<string, string>): string {
	const entries = Object.entries(params);
	return path
		.split('/')
		.map((segment) => {
			const match = entries.find(([, value]) => value === segment);
			return match ? `:${match[0]}` : segment;
		})
		.join('/');
}

/**
 * The route pattern a request matched, with parameter names rather than values, for example
 * `/rest/workflows/:workflowId`. Express sets `req.route` before a route's own middleware chain
 * runs, so a gate registered on the route sees its pattern. `req.baseUrl` is the mount path as
 * matched, so a parameter in a controller prefix, such as `/rest/projects/:projectId/agents`,
 * arrives with its value filled in; the routers merge their parameters, so each matched segment
 * goes back to its name.
 */
export function getRoutePattern(req: Request): string {
	const route: unknown = req.route;
	const routePath = isRecord(route) && typeof route.path === 'string' ? route.path : '';
	const params: Record<string, string> = isRecord(req.params)
		? Object.fromEntries(
				Object.entries(req.params).filter(
					(entry): entry is [string, string] => typeof entry[1] === 'string',
				),
			)
		: {};
	const pattern = `${withParamNames(req.baseUrl, params)}${routePath}`;
	return pattern || withParamNames(req.path, params);
}
