import type { ZodClass } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import type { AccessScope, ApiKeyScopeRequirement, Controller } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Request, RequestHandler, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { sendPublicApiErrorResponse } from '@/public-api/v1/public-api-error-response';
import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { LastActiveAtService } from '@/services/last-active-at.service';

function apiKeyScopesSatisfy(
	granted: readonly string[] | undefined,
	requirement: ApiKeyScopeRequirement,
): boolean {
	if (!granted) return false;

	if (typeof requirement === 'string') {
		return granted.includes(requirement);
	}

	if ('anyOf' in requirement) {
		return requirement.anyOf.some((scope) => granted.includes(scope));
	}

	return requirement.allOf.every((scope) => granted.includes(scope));
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
			const argTypes = Reflect.getMetadata(
				'design:paramtypes',
				controller,
				handlerName,
			) as unknown[];

			const handler = async (req: Request, res: Response) => {
				const args: unknown[] = [req, res];
				for (let index = 0; index < route.args.length; index++) {
					const arg = route.args[index];
					if (!arg) continue;
					if (arg.type === 'param') {
						args.push(req.params[arg.key]);
					} else if (arg.type === 'body' || arg.type === 'query') {
						const paramType = argTypes[index] as ZodClass | undefined;
						if (paramType && 'safeParse' in paramType) {
							const output = paramType.safeParse(req[arg.type]);
							if (output.success) {
								args.push(output.data);
							} else {
								throw new BadRequestError(output.error.errors[0]?.message ?? 'Invalid request');
							}
						} else {
							throw new UnexpectedError(
								`Public API route ${controllerClass.name}.${handlerName} is missing a Zod DTO for @${arg.type}`,
							);
						}
					} else {
						throw new UnexpectedError(`Unknown arg type: ${String(arg.type)}`);
					}
				}

				const result = await controller[handlerName](...args);

				if (res.headersSent) return;

				if (route.responseDto) {
					res.json(route.responseDto.parse(result));
					return;
				}

				res.json(result);
			};

			const middlewares: RequestHandler[] = [this.createAuthMiddleware(apiVersion)];

			if (route.apiKeyScope) {
				middlewares.push(this.createApiKeyScopeMiddleware(route.apiKeyScope));
			}

			if (route.accessScope) {
				middlewares.push(this.createAccessScopeMiddleware(route.accessScope));
			}

			middlewares.push(...controllerMiddlewares, ...(route.middlewares ?? []));

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

	private createAuthMiddleware(apiVersion: string): RequestHandler {
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
					path: req.path,
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
