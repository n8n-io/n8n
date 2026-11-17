import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { ScimOperation, ScimRejectReason } from './scim-request.types';

const rejectReasons = new WeakMap<Response, ScimRejectReason>();

/** Records why n8n rejects this SCIM request. The observer reports it when the response ends. */
export function markScimRejection(res: Response, reason: ScimRejectReason) {
	rejectReasons.set(res, reason);
}

const DISCOVERY_RESOURCES = new Set(['ServiceProviderConfig', 'ResourceTypes', 'Schemas']);

/** `path` is relative to `/scim/v2`, for example `/Users/<id>`. */
export function scimOperationOf(method: string, path: string): ScimOperation {
	const [resource, id, ...rest] = path.split('/').filter(Boolean);
	if (rest.length > 0) return 'other';

	if (resource === 'Users') {
		if (id === undefined) {
			if (method === 'GET') return 'list_users';
			if (method === 'POST') return 'create_user';
			return 'other';
		}
		if (method === 'GET') return 'get_user';
		if (method === 'PUT') return 'replace_user';
		if (method === 'PATCH') return 'patch_user';
		if (method === 'DELETE') return 'delete_user';
		return 'other';
	}

	if (resource && DISCOVERY_RESOURCES.has(resource) && method === 'GET') return 'discovery';

	return 'other';
}

function reasonFromStatus(status: number): ScimRejectReason {
	if (status === 400 || status === 422) return 'invalid_request';
	if (status === 401) return 'invalid_token';
	if (status === 403) return 'forbidden';
	if (status === 404) return 'not_found';
	if (status === 409) return 'conflict';
	if (status === 429) return 'rate_limited';
	if (status >= 500) return 'internal_error';
	return 'other';
}

/**
 * Reports each SCIM response with an error status. Only the identity provider
 * sees the response, so without this report an admin cannot see why
 * provisioning fails. It runs before route matching, so it also covers the IP
 * rate limit, a path that n8n does not support, and a failed body validation.
 */
@Service()
export class ScimRequestObserver {
	constructor(private readonly eventService: EventService) {}

	getMiddleware(): RequestHandler {
		return (req: Request, res: Response, next: NextFunction) => {
			this.observe(req, res);
			next();
		};
	}

	observe(req: Request, res: Response) {
		// Read the path now: Express can change `req.path` while other routers run.
		const operation = scimOperationOf(req.method, req.path);

		res.once('finish', () => {
			if (res.statusCode < 400) return;

			this.eventService.emit('scim-request-rejected', {
				operation,
				status: res.statusCode,
				reason: rejectReasons.get(res) ?? reasonFromStatus(res.statusCode),
			});
		});
	}
}
