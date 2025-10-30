/* eslint-disable @typescript-eslint/no-invalid-void-type */
import type { BooleanLicenseFeature } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope, Scope } from '@n8n/permissions';
import type express from 'express';
import type { NextFunction } from 'express';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { License } from '@/license';
import { userHasScopes } from '@/permissions.ee/check-access';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import type { PaginatedRequest } from '../../../types';
import { decodeCursor } from '../services/pagination.service';

const UNLIMITED_USERS_QUOTA = -1;

export type ProjectScopeResource = 'workflow' | 'credential';

const buildScopeMiddleware = (
	scopes: Scope[],
	resource?: ProjectScopeResource,
	{ globalOnly } = { globalOnly: false },
) => {
	return async (
		req: AuthenticatedRequest<{ id?: string }>,
		res: express.Response,
		next: express.NextFunction,
	): Promise<express.Response | void> => {
		const params: { credentialId?: string; workflowId?: string } = {};
		if (req.params.id) {
			if (resource === 'workflow') {
				params.workflowId = req.params.id;
			} else if (resource === 'credential') {
				params.credentialId = req.params.id;
			}
		}

		try {
			if (!(await userHasScopes(req.user, scopes, globalOnly, params))) {
				return res.status(403).json({ message: 'Forbidden' });
			}
		} catch (error) {
			if (error instanceof NotFoundError) {
				return res.status(404).json({ message: error.message });
			}
			throw error;
		}

		return next();
	};
};

export const globalScope = (scopes: Scope | Scope[]) =>
	buildScopeMiddleware(Array.isArray(scopes) ? scopes : [scopes], undefined, { globalOnly: true });

export const projectScope = (scopes: Scope | Scope[], resource: ProjectScopeResource) =>
	buildScopeMiddleware(Array.isArray(scopes) ? scopes : [scopes], resource, { globalOnly: false });

export const validCursor = (
	req: PaginatedRequest,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	if (req.query.cursor) {
		const { cursor } = req.query;
		try {
			const paginationData = decodeCursor(cursor);
			if ('offset' in paginationData) {
				req.query.offset = paginationData.offset;
				req.query.limit = paginationData.limit;
			} else {
				req.query.lastId = paginationData.lastId;
				req.query.limit = paginationData.limit;
			}
		} catch (error) {
			return res.status(400).json({
				message: 'An invalid cursor was provided',
			});
		}
	}

	return next();
};

const emptyMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();
export const apiKeyHasScope = (apiKeyScope: ApiKeyScope) => {
	return Container.get(License).isApiKeyScopesEnabled()
		? Container.get(PublicApiKeyService).getApiKeyScopeMiddleware(apiKeyScope)
		: emptyMiddleware;
};

export const apiKeyHasScopeWithGlobalScopeFallback = (
	config: { scope: ApiKeyScope & Scope } | { apiKeyScope: ApiKeyScope; globalScope: Scope },
) => {
	if ('scope' in config) {
		return Container.get(License).isApiKeyScopesEnabled()
			? Container.get(PublicApiKeyService).getApiKeyScopeMiddleware(config.scope)
			: globalScope(config.scope);
	} else {
		return Container.get(License).isApiKeyScopesEnabled()
			? Container.get(PublicApiKeyService).getApiKeyScopeMiddleware(config.apiKeyScope)
			: globalScope(config.globalScope);
	}
};

export const validLicenseWithUserQuota = (
	_: express.Request,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	const license = Container.get(License);
	if (license.getUsersLimit() !== UNLIMITED_USERS_QUOTA) {
		return res.status(403).json({
			message: '/users path can only be used with a valid license. See https://n8n.io/pricing/',
		});
	}

	return next();
};

export const isLicensed = (feature: BooleanLicenseFeature) => {
	return async (_: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
		if (Container.get(License).isLicensed(feature)) return next();

		return res.status(403).json({ message: new FeatureNotLicensedError(feature).message });
	};
};
