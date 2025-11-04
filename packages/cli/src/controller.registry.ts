import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { inProduction } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { type BooleanLicenseFeature } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import type { AccessScope, Controller, RateLimit } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { UnexpectedError } from 'n8n-workflow';
import type { ZodClass } from 'zod-class';

import { NotFoundError } from './errors/response-errors/not-found.error';
import { LastActiveAtService } from './services/last-active-at.service';

import { AuthService } from '@/auth/auth.service';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { License } from '@/license';
import { userHasScopes } from '@/permissions.ee/check-access';
import { send } from '@/response-helper'; // TODO: move `ResponseHelper.send` to this file

@Service()
export class ControllerRegistry {
	constructor(
		private readonly license: License,
		private readonly authService: AuthService,
		private readonly globalConfig: GlobalConfig,
		private readonly metadata: ControllerRegistryMetadata,
		private readonly lastActiveAtService: LastActiveAtService,
	) {}

	activate(app: Application) {
		for (const controllerClass of this.metadata.controllerClasses) {
			this.activateController(app, controllerClass);
		}
	}

	private activateController(app: Application, controllerClass: Controller) {
		const metadata = this.metadata.getControllerMetadata(controllerClass);

		const router = Router({ mergeParams: true });
		const basePath = metadata.registerOnRootPath
			? metadata.basePath
			: `/${this.globalConfig.endpoints.rest}/${metadata.basePath}`;
		const prefix = basePath.replace(/\/+/g, '/').replace(/\/$/, '');
		app.use(prefix === '' ? '/' : prefix, router);

		const controller = Container.get(controllerClass) as Controller;
		const controllerMiddlewares = metadata.middlewares.map(
			(handlerName) => controller[handlerName].bind(controller) as RequestHandler,
		);

		for (const [handlerName, route] of metadata.routes) {
			const argTypes = Reflect.getMetadata(
				'design:paramtypes',
				controller,
				handlerName,
			) as unknown[];

			const handler = async (req: Request, res: Response) => {
				const args: unknown[] = [req, res];
				for (let index = 0; index < route.args.length; index++) {
					const arg = route.args[index];
					if (!arg) continue; // Skip args without any decorators
					if (arg.type === 'param') args.push(req.params[arg.key]);
					else if (['body', 'query'].includes(arg.type)) {
						const paramType = argTypes[index] as ZodClass;
						if (paramType && 'safeParse' in paramType) {
							const output = paramType.safeParse(req[arg.type]);
							if (output.success) args.push(output.data);
							else {
								return res.status(400).json(output.error.errors[0]);
							}
						}
					} else throw new UnexpectedError('Unknown arg type: ' + arg.type);
				}
				return await controller[handlerName](...args);
			};

			router[route.method](
				route.path,
				...(inProduction && route.rateLimit
					? [this.createRateLimitMiddleware(route.rateLimit)]
					: []),

				...(route.skipAuth
					? []
					: ([
							this.authService.createAuthMiddleware({
								allowSkipMFA: route.allowSkipMFA,
								allowSkipPreviewAuth: route.allowSkipPreviewAuth,
							}),
							this.lastActiveAtService.middleware.bind(this.lastActiveAtService),
						] as RequestHandler[])),
				...(route.licenseFeature ? [this.createLicenseMiddleware(route.licenseFeature)] : []),
				...(route.accessScope ? [this.createScopedMiddleware(route.accessScope)] : []),
				...controllerMiddlewares,
				...route.middlewares,
				route.usesTemplates
					? async (req, res) => {
							// When using templates, intentionally drop the return value,
							// since template rendering writes directly to the response.
							await handler(req, res);
						}
					: send(handler),
			);
		}
	}

	private createRateLimitMiddleware(rateLimit: true | RateLimit): RequestHandler {
		if (typeof rateLimit === 'boolean') rateLimit = {};
		return expressRateLimit({
			windowMs: rateLimit.windowMs,
			limit: rateLimit.limit,
			message: { message: 'Too many requests' },
		});
	}

	private createLicenseMiddleware(feature: BooleanLicenseFeature): RequestHandler {
		return (_req, res, next) => {
			if (!this.license.isLicensed(feature)) {
				res.status(403).json({ status: 'error', message: 'Plan lacks license for this feature' });
				return;
			}
			next();
		};
	}

	private createScopedMiddleware(accessScope: AccessScope): RequestHandler {
		return async (
			req: AuthenticatedRequest<{ credentialId?: string; workflowId?: string; projectId?: string }>,
			res,
			next,
		) => {
			if (!req.user) throw new UnauthenticatedError();

			const { scope, globalOnly } = accessScope;

			try {
				if (!(await userHasScopes(req.user, [scope], globalOnly, req.params))) {
					res.status(403).json({
						status: 'error',
						message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
					});
					return;
				}
			} catch (error) {
				if (error instanceof NotFoundError) {
					res.status(404).json({ status: 'error', message: error.message });
					return;
				}
				throw error;
			}

			next();
		};
	}
}
