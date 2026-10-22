import { LicenseState, Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { AuthStrategyRegistry } from '@n8n/backend-services/auth';
import type { BooleanLicenseFeature } from '@n8n/constants';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import type {
	AccessScope,
	ApiKeyScopeRequirement,
	Controller,
	DeprecationInfo,
	RequestBodyMedia,
} from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Request, RequestHandler, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import {
	createIdempotencyMiddleware,
	takeIdempotencyClaimId,
} from '@/idempotency/idempotency.middleware';
import { IdempotencyKeyService } from '@/public-api/idempotency-key.service';
import { BadRequestError, UnsupportedMediaTypeError } from '@n8n/errors';
import { License } from '@/license';
import { assertContentType } from '@/public-api/media-types/content-type';
import { sendBinaryResponse } from '@/public-api/media-types/binary-response';
import type { RequestBodyHandler } from '@/public-api/media-types/request-body';
import { userHasScopes } from '@/permissions.ee/check-access';
import { USER_QUOTA_FORBIDDEN_MESSAGE } from '@/public-api/constants';
import type { ValidatedParamArg } from '@/public-api/public-api-route-resolver';
import {
	apiKeyScopesSatisfy,
	findBodyArg,
	findValidatedParamArgs,
	isRequestBodyRequired,
	resolvePublicApiRoutes,
	resolveRouteArgs,
	resolveSuccessStatus,
} from '@/public-api/public-api-route-resolver';
import { formatValidationError } from '@/public-api/public-api-validation-error';
import { PublicApiRateLimitService } from '@/public-api/public-api-rate-limit.service';
import { sendPublicApiErrorResponse } from '@/public-api/v1/public-api-error-response';
import { LastActiveAtService } from '@/services/last-active-at.service';

function parsePathParam(key: string, schema: ZodTypeAny, params: Request['params']): unknown {
	const output = z.object({ [key]: schema }).safeParse(params);

	if (!output.success) {
		throw new BadRequestError(formatValidationError('params', output.error));
	}

	return output.data[key];
}

/**
 * Whether an Express route template (`/widgets/:widgetId`) matches a request path. A `:param`
 * segment matches any single segment. Any other segment must be equal.
 */
function matchesPathTemplate(template: string, path: string): boolean {
	const templateSegments = template.split('/');
	const pathSegments = (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path).split(
		'/',
	);
	return (
		templateSegments.length === pathSegments.length &&
		templateSegments.every(
			(segment, i) =>
				segment.startsWith(':') || segment.toLowerCase() === pathSegments[i].toLowerCase(),
		)
	);
}

// Match the legacy version-less route. req.path drops the prefix, req.baseUrl adds /api/v1
function routePath(prefix: string, req: Request): string {
	const path = (prefix === '/' ? '' : prefix) + req.path;
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function toEndpointPath(apiVersion: string, prefix: string, routeTemplate: string): string {
	const path = `/${apiVersion}${prefix === '/' ? '' : prefix}${routeTemplate}`;
	return path.endsWith('/') ? path.slice(0, -1) : path;
}

@Service()
export class PublicApiControllerRegistry {
	constructor(
		private readonly metadata: ControllerRegistryMetadata,
		private readonly authStrategyRegistry: AuthStrategyRegistry,
		private readonly lastActiveAtService: LastActiveAtService,
		private readonly eventService: EventService,
		private readonly rateLimitService: PublicApiRateLimitService,
		private readonly idempotencyKeyService: IdempotencyKeyService,
		private readonly logger: Logger,
	) {}

	activate(router: Router, apiVersion: string) {
		const idempotency = createIdempotencyMiddleware(this.idempotencyKeyService);
		const methodsByTemplate = new Map<string, string[]>();
		for (const route of resolvePublicApiRoutes()) {
			const methods = methodsByTemplate.get(route.path) ?? [];
			methods.push(route.method.toUpperCase());
			methodsByTemplate.set(route.path, methods);
		}

		// A URL can match several templates, for example `/:id/archive` and `/:id/:versionId`.
		// Allow lists the methods of every template that matches this URL.
		const allowedMethodsFor = (path: string): string[] => {
			const allowed = new Set<string>();
			for (const [template, methods] of methodsByTemplate) {
				if (!matchesPathTemplate(template, path)) {
					continue;
				}
				for (const method of methods) {
					allowed.add(method);
				}
			}
			return [...allowed];
		};

		// HEAD is not supported. Express would otherwise run the GET handler for it.
		router.use((req, res, next) => {
			if (req.method !== 'HEAD') {
				return next();
			}

			const allowed = allowedMethodsFor(req.path);
			if (allowed.length === 0) {
				return next();
			}

			res.set('Allow', allowed.join(', '));
			res.status(405).json({ message: 'HEAD method not allowed' });
		});

		for (const controllerClass of this.metadata.controllerClasses) {
			const metadata = this.metadata.getControllerMetadata(controllerClass);
			if (!metadata.isPublicApi) continue;
			this.activateController(router, controllerClass, apiVersion, idempotency);
		}

		// A known path with a method no controller serves.
		// Registered after every controller, so it only runs when no route matched.
		for (const path of methodsByTemplate.keys()) {
			router.all(path, (req, res) => {
				res.set('Allow', allowedMethodsFor(req.path).join(', '));
				res.status(405).json({ message: `${req.method} method not allowed` });
			});
		}
	}

	private activateController(
		parent: Router,
		controllerClass: Controller,
		apiVersion: string,
		idempotency: RequestHandler,
	) {
		const metadata = this.metadata.getControllerMetadata(controllerClass);
		const controllerRouter = createRouter({ mergeParams: true });
		const prefix = metadata.basePath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
		parent.use(prefix === '' ? '/' : prefix, controllerRouter);

		const controller = Container.get(controllerClass) as Controller;
		const controllerMiddlewares = metadata.middlewares.map(
			(handlerName) => controller[handlerName].bind(controller) as RequestHandler,
		);

		for (const [handlerName, route] of metadata.routes) {
			const resolvedArgs = resolveRouteArgs(controllerClass, handlerName, route.args);

			const successStatus = resolveSuccessStatus(
				controllerClass.name,
				handlerName,
				route.successStatus,
			);

			const bodyArg = findBodyArg(resolvedArgs);
			const bodyRequired = bodyArg
				? (bodyArg.required ?? isRequestBodyRequired(bodyArg.dto))
				: false;

			const handler = async (req: Request, res: Response) => {
				const args: unknown[] = [req, res];
				for (const arg of resolvedArgs) {
					if (arg.type === 'param') {
						args.push(
							arg.schema ? parsePathParam(arg.key, arg.schema, req.params) : req.params[arg.key],
						);
						continue;
					}

					const isBodyArg = arg.type === 'body' && bodyArg;
					const input = isBodyArg ? bodyArg.handler.readInput(req) : req[arg.type];

					const output = arg.dto.safeParse(input);
					if (output.success) {
						args.push(output.data);
					} else {
						const message = isBodyArg
							? bodyArg.handler.formatValidationError(output.error)
							: formatValidationError(arg.type, output.error);
						throw new BadRequestError(message);
					}
				}

				if (route.binaryResponse) {
					const result = await controller[handlerName](...args);
					await sendBinaryResponse(
						res,
						route.binaryResponse,
						successStatus,
						`${controllerClass.name}.${handlerName}`,
						result,
					);
					await this.releaseIdempotencyClaim(res);
					return;
				}

				const result = await controller[handlerName](...args);

				if (res.headersSent) {
					await this.releaseIdempotencyClaim(res);
					return;
				}

				if (successStatus === 204 || (!route.responseDto && result === undefined)) {
					await this.storeIdempotencyResponse(res, successStatus, null);
					res.status(successStatus).send();
					return;
				}

				const body = route.responseDto ? route.responseDto.parse(result) : result;
				await this.storeIdempotencyResponse(res, successStatus, body);
				res.status(successStatus).json(body);
			};

			const middlewares: RequestHandler[] = [];

			if (route.deprecated) {
				middlewares.push(this.createDeprecationMiddleware(route.deprecated));
			}

			middlewares.push(this.createAuthMiddleware(apiVersion, prefix));
			middlewares.push(
				...this.rateLimitService.createRouteLimiters(
					route.method,
					toEndpointPath(apiVersion, prefix, route.path),
					route.rateLimitAccess,
				),
			);

			// Path param validation must run before the scope checks, so that a malformed param always
			// returns 400, rather than 404 or 403 depending on the caller's access.
			const paramArgs = findValidatedParamArgs(resolvedArgs);

			if (paramArgs.length) {
				middlewares.push(this.createPathParamMiddleware(paramArgs));
			}

			if (route.apiKeyScope) {
				middlewares.push(this.createApiKeyScopeMiddleware(route.apiKeyScope));
			}

			if (route.accessScope) {
				middlewares.push(this.createAccessScopeMiddleware(route.accessScope));
			}

			if (route.licenseFeature) {
				middlewares.push(this.createLicenseMiddleware(route.licenseFeature));
			}

			if (route.requiresUserQuota) {
				middlewares.push(this.createUserQuotaMiddleware());
			}

			// After every access gate, the body's Content-Type is checked and then parsed.
			if (bodyArg) {
				middlewares.push(this.createBodyMiddleware(bodyArg.media, bodyRequired, bodyArg.handler));
			}

			middlewares.push(...controllerMiddlewares, ...(route.middlewares ?? []), idempotency);

			const finalHandler: RequestHandler = async (req, res, next) => {
				try {
					await handler(req, res);
				} catch (error) {
					await this.releaseIdempotencyClaim(res);
					if (res.headersSent) {
						next(error);
						return;
					}
					sendPublicApiErrorResponse(
						res,
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			};

			controllerRouter[route.method](route.path, ...middlewares, finalHandler);
		}
	}

	private async storeIdempotencyResponse(
		res: Response,
		status: number,
		body: unknown,
	): Promise<void> {
		const id = takeIdempotencyClaimId(res);
		if (!id) return;

		try {
			await this.idempotencyKeyService.complete(id, status, body);
		} catch (error) {
			this.logger.error('Failed to store an idempotency response', { error });
			await this.releaseIdempotencyClaimById(id);
		}
	}

	private async releaseIdempotencyClaim(res: Response): Promise<void> {
		const id = takeIdempotencyClaimId(res);
		if (!id) return;

		await this.releaseIdempotencyClaimById(id);
	}

	private async releaseIdempotencyClaimById(id: string): Promise<void> {
		try {
			await this.idempotencyKeyService.release(id);
		} catch (error) {
			this.logger.error('Failed to release an idempotency key', { error });
		}
	}

	private createAuthMiddleware(apiVersion: string, prefix: string): RequestHandler {
		return async (req, res, next) => {
			const authenticated = await this.authStrategyRegistry.authenticate(
				req as AuthenticatedRequest,
			);

			if (!authenticated) {
				res.status(401).json({ message: 'Unauthorized' });
				return;
			}

			const userId = (req as AuthenticatedRequest).user?.id;
			if (userId) {
				this.lastActiveAtService.updateLastActiveIfStale(userId).catch(() => undefined);
				this.eventService.emit('public-api-invoked', {
					userId,
					path: routePath(prefix, req),
					method: req.method,
					apiVersion,
					userAgent: req.headers['user-agent'],
				});
			}

			next();
		};
	}

	/**
	 * Sets the RFC 9745 `Deprecation` header. The wire format (`@<unix-seconds>`) is built here, so
	 * call sites pass a `Date`. `since` is fixed per route, so the header is the same on every request.
	 */
	private createDeprecationMiddleware({ since }: DeprecationInfo): RequestHandler {
		const deprecation = `@${Math.floor(since.getTime() / 1000)}`;

		return (_req, res, next) => {
			res.setHeader('Deprecation', deprecation);
			next();
		};
	}

	private createApiKeyScopeMiddleware(requirement: ApiKeyScopeRequirement): RequestHandler {
		return (req, res, next) => {
			const { tokenGrant } = req as AuthenticatedRequest;

			if (!tokenGrant || !apiKeyScopesSatisfy(tokenGrant.apiKeyScopes, requirement)) {
				res.status(403).json({ message: 'Forbidden' });
				return;
			}

			next();
		};
	}

	private createLicenseMiddleware(feature: BooleanLicenseFeature): RequestHandler {
		return (_req, res, next) => {
			if (!Container.get(License).isLicensed(feature)) {
				res.status(403).json({ message: new FeatureNotLicensedError(feature).message });
				return;
			}

			next();
		};
	}

	private createUserQuotaMiddleware(): RequestHandler {
		return (_req, res, next) => {
			if (Container.get(LicenseState).getMaxUsers() !== UNLIMITED_LICENSE_QUOTA) {
				res.status(403).json({ message: USER_QUOTA_FORBIDDEN_MESSAGE });
				return;
			}

			next();
		};
	}

	private createBodyMiddleware(
		media: RequestBodyMedia,
		bodyRequired: boolean,
		handler: RequestBodyHandler,
	): RequestHandler {
		return async (req, res, next) => {
			let matched: boolean;
			try {
				matched = assertContentType({
					header: req.headers['content-type'],
					expected: media.mediaType,
					bodyRequired,
				});
			} catch (error) {
				sendPublicApiErrorResponse(
					res,
					error instanceof UnsupportedMediaTypeError ? error : new Error(String(error)),
				);
				return;
			}

			if (!matched || !handler.parseBody) {
				next();
				return;
			}

			try {
				await handler.parseBody(media, req, res);
			} catch (error) {
				sendPublicApiErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
				return;
			}

			next();
		};
	}

	/**
	 * Rejects a path param that breaks its `@Param` schema, ahead of the scope middlewares. The
	 * handler parses the params again to bind its arguments; by then they are known to be valid.
	 */
	private createPathParamMiddleware(args: ValidatedParamArg[]): RequestHandler {
		return (req, res, next) => {
			try {
				for (const { key, schema } of args) {
					parsePathParam(key, schema, req.params);
				}
			} catch (error) {
				sendPublicApiErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
				return;
			}

			next();
		};
	}

	private createAccessScopeMiddleware(accessScope: AccessScope): RequestHandler {
		return async (req, res, next) => {
			const authReq = req as AuthenticatedRequest;

			if (!authReq.user) {
				res.status(401).json({ message: 'Unauthorized' });
				return;
			}

			try {
				if (
					!(await userHasScopes(
						authReq.user,
						[accessScope.scope],
						accessScope.globalOnly,
						req.params,
					))
				) {
					res.status(403).json({ message: 'Forbidden' });
					return;
				}
			} catch (error) {
				sendPublicApiErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
				return;
			}

			next();
		};
	}
}
