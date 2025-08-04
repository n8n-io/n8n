'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isLicensed =
	exports.validLicenseWithUserQuota =
	exports.apiKeyHasScopeWithGlobalScopeFallback =
	exports.apiKeyHasScope =
	exports.validCursor =
	exports.projectScope =
	exports.globalScope =
		void 0;
const di_1 = require('@n8n/di');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const license_1 = require('@/license');
const check_access_1 = require('@/permissions.ee/check-access');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const pagination_service_1 = require('../services/pagination.service');
const UNLIMITED_USERS_QUOTA = -1;
const buildScopeMiddleware = (scopes, resource, { globalOnly } = { globalOnly: false }) => {
	return async (req, res, next) => {
		const params = {};
		if (req.params.id) {
			if (resource === 'workflow') {
				params.workflowId = req.params.id;
			} else if (resource === 'credential') {
				params.credentialId = req.params.id;
			}
		}
		try {
			if (!(await (0, check_access_1.userHasScopes)(req.user, scopes, globalOnly, params))) {
				return res.status(403).json({ message: 'Forbidden' });
			}
		} catch (error) {
			if (error instanceof not_found_error_1.NotFoundError) {
				return res.status(404).json({ message: error.message });
			}
			throw error;
		}
		return next();
	};
};
const globalScope = (scopes) =>
	buildScopeMiddleware(Array.isArray(scopes) ? scopes : [scopes], undefined, { globalOnly: true });
exports.globalScope = globalScope;
const projectScope = (scopes, resource) =>
	buildScopeMiddleware(Array.isArray(scopes) ? scopes : [scopes], resource, { globalOnly: false });
exports.projectScope = projectScope;
const validCursor = (req, res, next) => {
	if (req.query.cursor) {
		const { cursor } = req.query;
		try {
			const paginationData = (0, pagination_service_1.decodeCursor)(cursor);
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
exports.validCursor = validCursor;
const emptyMiddleware = (_req, _res, next) => next();
const apiKeyHasScope = (apiKeyScope) => {
	return di_1.Container.get(license_1.License).isApiKeyScopesEnabled()
		? di_1.Container.get(public_api_key_service_1.PublicApiKeyService).getApiKeyScopeMiddleware(
				apiKeyScope,
			)
		: emptyMiddleware;
};
exports.apiKeyHasScope = apiKeyHasScope;
const apiKeyHasScopeWithGlobalScopeFallback = (config) => {
	if ('scope' in config) {
		return di_1.Container.get(license_1.License).isApiKeyScopesEnabled()
			? di_1.Container.get(public_api_key_service_1.PublicApiKeyService).getApiKeyScopeMiddleware(
					config.scope,
				)
			: (0, exports.globalScope)(config.scope);
	} else {
		return di_1.Container.get(license_1.License).isApiKeyScopesEnabled()
			? di_1.Container.get(public_api_key_service_1.PublicApiKeyService).getApiKeyScopeMiddleware(
					config.apiKeyScope,
				)
			: (0, exports.globalScope)(config.globalScope);
	}
};
exports.apiKeyHasScopeWithGlobalScopeFallback = apiKeyHasScopeWithGlobalScopeFallback;
const validLicenseWithUserQuota = (_, res, next) => {
	const license = di_1.Container.get(license_1.License);
	if (license.getUsersLimit() !== UNLIMITED_USERS_QUOTA) {
		return res.status(403).json({
			message: '/users path can only be used with a valid license. See https://n8n.io/pricing/',
		});
	}
	return next();
};
exports.validLicenseWithUserQuota = validLicenseWithUserQuota;
const isLicensed = (feature) => {
	return async (_, res, next) => {
		if (di_1.Container.get(license_1.License).isLicensed(feature)) return next();
		return res
			.status(403)
			.json({ message: new feature_not_licensed_error_1.FeatureNotLicensedError(feature).message });
	};
};
exports.isLicensed = isLicensed;
//# sourceMappingURL=global.middleware.js.map
