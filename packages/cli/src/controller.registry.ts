import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { GlobalConfig } from '@n8n/config';
import { type BooleanLicenseFeature } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import type {
	AccessScope,
	Controller,
	RateLimiterLimits,
	StaticRouterMetadata,
	KeyedRateLimiterConfig,
} from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';
import assert from 'node:assert';
import type { ZodClass } from 'zod-class';

import { NotFoundError } from './errors/response-errors/not-found.error';
import { LastActiveAtService } from './services/last-active-at.service';
import { RateLimitService } from './services/rate-limit.service';

import { AuthService } from '@/auth/auth.service';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { License } from '@/license';
import { userHasScopes } from '@/permissions.ee/check-access';
import { send } from '@/response-helper';
import { CorsService } from './services/cors-service';
import { inProduction } from '@n8n/backend-common';

@Service()
export class ControllerRegistry {
	constructor(
		private readonly license: License,
		private readonly authService: AuthService,
		private readonly globalConfig: GlobalConfig,
		private readonly metadata: ControllerRegistryMetadata,
		private readonly lastActiveAtService: LastActiveAtService,
		private readonly rateLimitService: RateLimitService,
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

		const staticRouters = (controllerClass as any).routers as StaticRouterMetadata[] | undefined;

		if (staticRouters) {
			for (const routerConfig of staticRouters) {
				if (!routerConfig.router) {
					throw new UnexpectedError(
						`Router is undefined for path "${routerConfig.path}" in controller "${controllerClass.name}"`,
					);
				}
				const middlewares = this.buildMiddlewares(routerConfig, controllerMiddlewares);
				router.use(routerConfig.path, ...middlewares, routerConfig.router);
			}
		}

		// Register regular routes
		for (const [handlerName, route] of metadata.routes) {
			// Original handler logic for non-router routes
			const argTypes = Reflect.getMetadata(
				'design:paramtypes',
				controller,
				handlerName,
			) as unknown[];

			const handler = async (req: Request, res: Response) => {
				if (route.cors) {
					const corsService = Container.get(CorsService);
					const corsOptions = route.cors === true ? {} : route.cors;
					corsService.applyCorsHeaders(req, res, corsOptions);
				}

				const args: unknown[] = [req, res];
				for (let index = 0; index < route.args.length; index++) {
					const arg = route.args[index];
					if (!arg) continue;
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

			const bodyArgIdx = route.args.findIndex((arg) => arg?.type === 'body');
			const bodyArgType = bodyArgIdx !== -1 ? (argTypes[bodyArgIdx] as ZodClass) : undefined;

			const middlewares = this.buildMiddlewares(route, controllerMiddlewares, bodyArgType);
			const finalHandler = route.usesTemplates
				? async (req: Request, res: Response) => {
						await handler(req, res);
					}
				: send(handler);

			router[route.method](route.path, ...middlewares, finalHandler);
		}
	}

	/**
	 * Builds middleware array based on route configuration.
	 * Used for both static routers and inline router definitions.
	 */
	private buildMiddlewares(
		route: {
			skipAuth?: boolean;
			allowSkipMFA?: boolean;
			allowSkipPreviewAuth?: boolean;
			ipRateLimit?: boolean | RateLimiterLimits;
			keyedRateLimit?: KeyedRateLimiterConfig;
			licenseFeature?: BooleanLicenseFeature;
			accessScope?: AccessScope;
			middlewares?: RequestHandler[];
		},
		controllerMiddlewares: RequestHandler[],
		bodyDtoClass?: ZodClass,
	): RequestHandler[] {
		const middlewares: RequestHandler[] = [];

		// LAYER 1: IP-based rate limiting (always before auth)
		if (inProduction && route.ipRateLimit) {
			middlewares.push(this.rateLimitService.createIpRateLimitMiddleware(route.ipRateLimit));
		}

		// LAYER 2a: Keyed rate limiting with body source (BEFORE auth)
		if (inProduction && route.keyedRateLimit?.source === 'body') {
			assert(
				bodyDtoClass,
				'Body argument type (@Body decorator) is required for body-based rate limiting',
			);

			middlewares.push(
				this.rateLimitService.createBodyKeyedRateLimitMiddleware(
					bodyDtoClass,
					route.keyedRateLimit,
				),
			);
		}

		if (!route.skipAuth) {
			middlewares.push(
				this.authService.createAuthMiddleware({
					allowSkipMFA: route.allowSkipMFA ?? false,
					allowSkipPreviewAuth: route.allowSkipPreviewAuth ?? false,
				}),
				this.lastActiveAtService.middleware.bind(this.lastActiveAtService) as RequestHandler,
			);
		}

		// LAYER 2b: User-based rate limiting with user source (AFTER auth)
		if (route.keyedRateLimit?.source === 'user') {
			assert(
				!route.skipAuth,
				`User-based rate limiting is only supported for authenticated endpoints. Route: ${JSON.stringify(route)}`,
			);

			// Separate ifs intentionally to prevent configuration errors in development
			if (inProduction) {
				middlewares.push(
					this.rateLimitService.createUserKeyedRateLimitMiddleware(route.keyedRateLimit),
				);
			}
		}

		if (route.licenseFeature) {
			middlewares.push(this.createLicenseMiddleware(route.licenseFeature));
		}

		if (route.accessScope) {
			middlewares.push(this.createScopedMiddleware(route.accessScope));
		}

		middlewares.push(...controllerMiddlewares);

		if (route.middlewares) {
			middlewares.push(...route.middlewares);
		}

		return middlewares;
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
