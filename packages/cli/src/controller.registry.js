'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ControllerRegistry = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const express_1 = require('express');
const express_rate_limit_1 = require('express-rate-limit');
const n8n_workflow_1 = require('n8n-workflow');
const auth_service_1 = require('@/auth/auth.service');
const constants_1 = require('@/constants');
const unauthenticated_error_1 = require('@/errors/response-errors/unauthenticated.error');
const license_1 = require('@/license');
const check_access_1 = require('@/permissions.ee/check-access');
const response_helper_1 = require('@/response-helper');
const not_found_error_1 = require('./errors/response-errors/not-found.error');
const last_active_at_service_1 = require('./services/last-active-at.service');
let ControllerRegistry = class ControllerRegistry {
	constructor(license, authService, globalConfig, metadata, lastActiveAtService) {
		this.license = license;
		this.authService = authService;
		this.globalConfig = globalConfig;
		this.metadata = metadata;
		this.lastActiveAtService = lastActiveAtService;
	}
	activate(app) {
		for (const controllerClass of this.metadata.controllerClasses) {
			this.activateController(app, controllerClass);
		}
	}
	activateController(app, controllerClass) {
		const metadata = this.metadata.getControllerMetadata(controllerClass);
		const router = (0, express_1.Router)({ mergeParams: true });
		const prefix = `/${this.globalConfig.endpoints.rest}/${metadata.basePath}`
			.replace(/\/+/g, '/')
			.replace(/\/$/, '');
		app.use(prefix, router);
		const controller = di_1.Container.get(controllerClass);
		const controllerMiddlewares = metadata.middlewares.map((handlerName) =>
			controller[handlerName].bind(controller),
		);
		for (const [handlerName, route] of metadata.routes) {
			const argTypes = Reflect.getMetadata('design:paramtypes', controller, handlerName);
			const handler = async (req, res) => {
				const args = [req, res];
				for (let index = 0; index < route.args.length; index++) {
					const arg = route.args[index];
					if (!arg) continue;
					if (arg.type === 'param') args.push(req.params[arg.key]);
					else if (['body', 'query'].includes(arg.type)) {
						const paramType = argTypes[index];
						if (paramType && 'safeParse' in paramType) {
							const output = paramType.safeParse(req[arg.type]);
							if (output.success) args.push(output.data);
							else {
								return res.status(400).json(output.error.errors[0]);
							}
						}
					} else throw new n8n_workflow_1.UnexpectedError('Unknown arg type: ' + arg.type);
				}
				return await controller[handlerName](...args);
			};
			router[route.method](
				route.path,
				...(backend_common_1.inProduction && route.rateLimit
					? [this.createRateLimitMiddleware(route.rateLimit)]
					: []),
				...(route.skipAuth
					? []
					: [
							this.authService.createAuthMiddleware(route.allowSkipMFA),
							this.lastActiveAtService.middleware.bind(this.lastActiveAtService),
						]),
				...(route.licenseFeature ? [this.createLicenseMiddleware(route.licenseFeature)] : []),
				...(route.accessScope ? [this.createScopedMiddleware(route.accessScope)] : []),
				...controllerMiddlewares,
				...route.middlewares,
				route.usesTemplates
					? async (req, res) => {
							await handler(req, res);
						}
					: (0, response_helper_1.send)(handler),
			);
		}
	}
	createRateLimitMiddleware(rateLimit) {
		if (typeof rateLimit === 'boolean') rateLimit = {};
		return (0, express_rate_limit_1.rateLimit)({
			windowMs: rateLimit.windowMs,
			limit: rateLimit.limit,
			message: { message: 'Too many requests' },
		});
	}
	createLicenseMiddleware(feature) {
		return (_req, res, next) => {
			if (!this.license.isLicensed(feature)) {
				res.status(403).json({ status: 'error', message: 'Plan lacks license for this feature' });
				return;
			}
			next();
		};
	}
	createScopedMiddleware(accessScope) {
		return async (req, res, next) => {
			if (!req.user) throw new unauthenticated_error_1.UnauthenticatedError();
			const { scope, globalOnly } = accessScope;
			try {
				if (!(await (0, check_access_1.userHasScopes)(req.user, [scope], globalOnly, req.params))) {
					res.status(403).json({
						status: 'error',
						message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
					});
					return;
				}
			} catch (error) {
				if (error instanceof not_found_error_1.NotFoundError) {
					res.status(404).json({ status: 'error', message: error.message });
					return;
				}
				throw error;
			}
			next();
		};
	}
};
exports.ControllerRegistry = ControllerRegistry;
exports.ControllerRegistry = ControllerRegistry = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			license_1.License,
			auth_service_1.AuthService,
			config_1.GlobalConfig,
			decorators_1.ControllerRegistryMetadata,
			last_active_at_service_1.LastActiveAtService,
		]),
	],
	ControllerRegistry,
);
//# sourceMappingURL=controller.registry.js.map
