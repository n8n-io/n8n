import { LicenseState } from '@n8n/backend-common';
import type { BooleanLicenseFeature } from '@n8n/constants';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import type { AccessScope, ApiKeyScopeRequirement, Controller } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Request, RequestHandler, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { userHasScopes } from '@/permissions.ee/check-access';
import { USER_QUOTA_FORBIDDEN_MESSAGE } from '@/public-api/constants';
import { assertRequestContentType } from '@/public-api/public-api-media-type';
import { createMultipartBodyMiddleware, filesByFieldName } from '@/public-api/public-api-multipart';
import {
	apiKeyScopesSatisfy,
	findBodyArg,
	isRequestBodyRequired,
	resolveRouteArgs,
	resolveSuccessStatus,
} from '@/public-api/public-api-route-resolver';
import { formatValidationError } from '@/public-api/public-api-validation-error';
import { deprecated } from '@/public-api/v1/shared/middlewares/global.middleware';
import { sendPublicApiErrorResponse } from '@/public-api/v1/public-api-error-response';
import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { LastActiveAtService } from '@/services/last-active-at.service';

function parsePathParam(key: string, schema: ZodTypeAny, params: Request['params']): unknown {
	const output = z.object({ [key]: schema }).safeParse(params);

	if (!output.success) {
		throw new BadRequestError(formatValidationError('params', output.error));
	}

	return output.data[key];
}

// Match the legacy version-less route. req.path drops the prefix, req.baseUrl adds /api/v1
function routePath(prefix: string, req: Request): string {
	const path = (prefix === '/' ? '' : prefix) + req.path;
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

@Service()
export class PublicApiControllerRegistry {
	constructor(
		private readonly metadata: ControllerRegistryMetadata,
		private readonly authStrategyRegistry: AuthStrategyRegistry,
		private readonly lastActiveAtService: LastActiveAtService,
		private readonly eventService: EventService,
	) {}

	activate(router: Router, apiVersion: string) {
		for (const controllerClass of this.metadata.controllerClasses) {
			const metadata = this.metadata.getControllerMetadata(controllerClass);
			if (!metadata.isPublicApi) continue;
			this.activateController(router, controllerClass, apiVersion);
		}
	}

	private activateController(parent: Router, controllerClass: Controller, apiVersion: string) {
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
			const bodyDto = bodyArg?.dto;
			const bodyRequired = bodyDto ? (bodyArg?.required ?? isRequestBodyRequired(bodyDto)) : false;
			const isMultipartBody = bodyArg?.mediaType === 'multipart/form-data';
			const binaryMediaType = route.successResponse?.binaryMediaType;

			const handler = async (req: Request, res: Response) => {
				// A multipart body's content type is asserted by a middleware before this handler runs.
				if (bodyDto && !isMultipartBody) {
					assertRequestContentType(req.headers['content-type'], 'application/json', bodyRequired);
				}

				const args: unknown[] = [req, res];
				for (const arg of resolvedArgs) {
					if (arg.type === 'param') {
						args.push(
							arg.schema ? parsePathParam(arg.key, arg.schema, req.params) : req.params[arg.key],
						);
						continue;
					}

					// A multipart body merges its text fields with its uploaded files; a file wins over a
					// text field sharing its name.
					const parseInput =
						arg.type === 'body' && arg.mediaType === 'multipart/form-data'
							? { ...req.body, ...filesByFieldName(req.files) }
							: req[arg.type];

					const output = arg.dto.safeParse(parseInput);
					if (output.success) {
						args.push(output.data);
					} else {
						throw new BadRequestError(formatValidationError(arg.type, output.error));
					}
				}

				const result = await controller[handlerName](...args);

				if (binaryMediaType !== undefined) {
					// The handler must write a binary response itself; not doing so is a bug, not a client
					// error, hence the 500 rather than an empty success response.
					if (!res.headersSent) {
						throw new UnexpectedError(
							`Public API route ${controllerClass.name}.${handlerName} declares a binary response ` +
								'(binaryMediaType) but returned without sending one',
						);
					}
					return;
				}

				if (res.headersSent) return;

				if (successStatus === 204 || (!route.responseDto && result === undefined)) {
					res.status(successStatus).send();
					return;
				}

				res
					.status(successStatus)
					.json(route.responseDto ? route.responseDto.parse(result) : result);
			};

			const middlewares: RequestHandler[] = [];

			if (route.deprecated) {
				middlewares.push(deprecated(route.deprecated));
			}

			middlewares.push(this.createAuthMiddleware(apiVersion, prefix));

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

			middlewares.push(...controllerMiddlewares, ...(route.middlewares ?? []));

			if (isMultipartBody) {
				const uploadLimits = bodyArg?.uploadLimits;
				if (!uploadLimits) {
					throw new UnexpectedError(
						`Public API route ${controllerClass.name}.${handlerName} declares a multipart @Body ` +
							'with no uploadLimits',
					);
				}

				const assertMultipartContentType: RequestHandler = (req, _res, next) => {
					assertRequestContentType(
						req.headers['content-type'],
						'multipart/form-data',
						bodyRequired,
					);
					next();
				};

				middlewares.push(
					this.wrapPublicApiMiddleware(assertMultipartContentType),
					this.wrapPublicApiMiddleware(createMultipartBodyMiddleware(uploadLimits())),
				);
			}

			const finalHandler: RequestHandler = async (req, res, next) => {
				try {
					await handler(req, res);
				} catch (error) {
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

	/**
	 * Runs `middleware`, sending any error it throws or passes to `next` through
	 * `sendPublicApiErrorResponse` directly - the same way `finalHandler` converts a handler error -
	 * instead of forwarding it to Express's own error-handling chain.
	 */
	private wrapPublicApiMiddleware(middleware: RequestHandler): RequestHandler {
		return (req, res, next) => {
			const sendErrorOrContinue = (error?: unknown) => {
				if (error) {
					sendPublicApiErrorResponse(
						res,
						error instanceof Error ? error : new Error(String(error)),
					);
					return;
				}
				next();
			};

			try {
				void middleware(req, res, sendErrorOrContinue);
			} catch (error) {
				sendErrorOrContinue(error);
			}
		};
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
