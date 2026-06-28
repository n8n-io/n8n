import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Router, ErrorRequestHandler, RequestHandler } from 'express';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { JsonObject } from 'swagger-ui-express';
import validator from 'validator';

import { Logger } from '@n8n/backend-common';

import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { LastActiveAtService } from '@/services/last-active-at.service';
import { UrlService } from '@/services/url.service';

import { createN8nPackageMulterOptions } from '@/modules/n8n-packages/utils/import-package-upload';

import { sendPublicApiErrorResponse } from './v1/public-api-error-response';

// Renders `x-required-scope` as a badge on each operation. swagger-ui-express
// serializes this function's source into the page, so it must be self-contained:
// no closures, no imports.
type ImmutableLike = { get(key: string): unknown };
type ImmutableListLike = { toJS(): string[] };
type SwaggerUiSystem = {
	React: {
		createElement(component: unknown, props: unknown): unknown;
		useEffect(effect: () => undefined | (() => void), deps: unknown[]): void;
	};
	specSelectors?: {
		specJson(): { getIn(path: string[]): ImmutableLike | null | undefined };
	};
};
type OperationSummaryProps = { specPath?: ImmutableListLike };

function scopeBadgePlugin() {
	const wrapOperationSummary =
		(originalComponent: unknown, system: SwaggerUiSystem) => (props: OperationSummaryProps) => {
			const pathArr = props.specPath?.toJS ? props.specPath.toJS() : null;
			const op = pathArr ? (system.specSelectors?.specJson().getIn(pathArr) ?? null) : null;
			const rawScope = op?.get ? op.get('x-required-scope') : null;
			const scope = typeof rawScope === 'string' ? rawScope : null;
			const method = pathArr ? pathArr[2] : null;
			const pathStr = pathArr ? pathArr[1] : null;
			system.React.useEffect(() => {
				if (!scope || scope === 'none' || !method || !pathStr) return;
				const candidates = document.querySelectorAll('.opblock-summary-' + method);
				let target: Element | null = null;
				for (const c of candidates) {
					const pathEl = c.querySelector('.opblock-summary-path');
					if (pathEl && pathEl.getAttribute('data-path') === pathStr) {
						target =
							c.querySelector('.opblock-summary-path-description-wrapper') ??
							c.querySelector('.opblock-summary-description');
						break;
					}
				}
				if (!target) return;
				const existing = target.querySelector(':scope > .x-scope-badge');
				if (existing) existing.remove();
				const badge = document.createElement('span');
				badge.className = 'x-scope-badge';
				badge.textContent = scope;
				target.appendChild(badge);
				return () => {
					badge.remove();
				};
			}, [scope, method, pathStr]);
			return system.React.createElement(originalComponent, props);
		};
	// eslint-disable-next-line @typescript-eslint/naming-convention -- Swagger UI plugin keys are PascalCase
	return { wrapComponents: { OperationSummary: wrapOperationSummary } };
}

function createLazySwaggerMiddleware(
	openApiSpecPath: string,
	publicApiEndpoint: string,
	version: string,
): RequestHandler {
	let cachedRouter: Router | undefined;

	return async (req, res, next) => {
		if (!cachedRouter) {
			const globalConfig = Container.get(GlobalConfig);
			const n8nPath = globalConfig.path;

			const YAML = await import('yaml');
			const spec = await fs.readFile(openApiSpecPath, 'utf-8');
			const swaggerDocument = YAML.parse(spec) as JsonObject;
			// add the server depending on the config so the user can interact with the API
			// from the Swagger UI
			swaggerDocument.server = [
				{
					url: `${Container.get(UrlService).getInstanceBaseUrl()}/${publicApiEndpoint}/${version}}`,
				},
			];

			const { serveFiles, setup } = await import('swagger-ui-express');
			const swaggerThemePath = path.join(__dirname, 'swagger-theme.css');
			const swaggerThemeCss = await fs.readFile(swaggerThemePath, { encoding: 'utf-8' });

			const swaggerSetupOpts = {
				customCss: swaggerThemeCss,
				customSiteTitle: 'n8n Public API UI',
				customfavIcon: `${n8nPath}favicon.ico`,
				swaggerOptions: {
					plugins: [scopeBadgePlugin],
				},
			};
			cachedRouter = express.Router();
			cachedRouter.use(
				serveFiles(swaggerDocument, swaggerSetupOpts),
				setup(swaggerDocument, swaggerSetupOpts),
			);
		}

		void cachedRouter(req, res, next);
	};
}

function createLazyValidatorMiddleware(
	openApiSpecPath: string,
	handlersDirectory: string,
	version: string,
): RequestHandler {
	let cachedRouter: Router | undefined;
	let initPromise: Promise<Router> | undefined;

	return async (req, res, next) => {
		if (!cachedRouter) {
			initPromise ??= (async () => {
				const { middleware: openApiValidatorMiddleware } = await import(
					'express-openapi-validator'
				);

				const authStrategyRegistry = Container.get(AuthStrategyRegistry);
				const eventService = Container.get(EventService);
				const lastActiveAtService = Container.get(LastActiveAtService);
				const logger = Container.get(Logger);

				const authenticate = async (req: AuthenticatedRequest) => {
					const authenticated = await authStrategyRegistry.authenticate(req);

					if (authenticated) {
						lastActiveAtService.updateLastActiveIfStale(req.user.id).catch((error: unknown) => {
							logger.error('Failed to update last active timestamp', { error });
						});
						eventService.emit('public-api-invoked', {
							userId: req.user.id,
							path: req.path,
							method: req.method,
							apiVersion: version,
							userAgent: req.headers['user-agent'],
						});
					}

					return authenticated;
				};

				const globalConfig = Container.get(GlobalConfig);
				const router = express.Router();
				router.use(
					openApiValidatorMiddleware({
						apiSpec: openApiSpecPath,
						operationHandlers: handlersDirectory,
						validateRequests: true,
						validateApiSpec: true,
						fileUploader: createN8nPackageMulterOptions(globalConfig),
						formats: {
							email: {
								type: 'string',
								validate: (email: string) => validator.isEmail(email),
							},
							identifier: {
								type: 'string',
								validate: (identifier: string) =>
									validator.isUUID(identifier) || validator.isEmail(identifier),
							},
							jsonString: {
								validate: (data: string) => {
									try {
										JSON.parse(data);
										return true;
									} catch (e) {
										return false;
									}
								},
							},
							nanoid: {
								type: 'string',
								validate: (id: string) => {
									return /^[A-Za-z0-9]{16}$/.test(id);
								},
							},
						},
						validateSecurity: {
							handlers: {
								ApiKeyAuth: authenticate,
								BearerAuth: authenticate,
							},
						},
					}),
				);
				return router;
			})();
			cachedRouter = await initPromise;
		}

		void cachedRouter(req, res, next);
	};
}

function createApiRouter(
	version: string,
	openApiSpecPath: string,
	handlersDirectory: string,
	publicApiEndpoint: string,
): Router {
	const globalConfig = Container.get(GlobalConfig);
	const payloadLimit = `${globalConfig.endpoints.payloadSizeMax}mb`;
	const apiController = express.Router();

	if (!globalConfig.publicApi.swaggerUiDisabled) {
		apiController.use(
			`/${publicApiEndpoint}/${version}/docs`,
			createLazySwaggerMiddleware(openApiSpecPath, publicApiEndpoint, version),
		);
	}

	apiController.get(`/${publicApiEndpoint}/${version}/openapi.yml`, (_, res) => {
		res.sendFile(openApiSpecPath);
	});

	// Error handler specifically for JSON parsing - must come immediately after express.json()
	const jsonParseErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
		if (error instanceof SyntaxError && 'body' in error) {
			res.status(400).json({
				message: 'Invalid JSON in request body',
			});
			return;
		}
		next(error);
	};

	apiController.use(
		`/${publicApiEndpoint}/${version}`,
		express.json({ limit: payloadLimit }),
		jsonParseErrorHandler,
		createLazyValidatorMiddleware(openApiSpecPath, handlersDirectory, version),
	);

	const publicApiErrorHandler: ErrorRequestHandler = (
		error: Error,
		_req: express.Request,
		res: express.Response,
		_next: express.NextFunction,
	) => {
		sendPublicApiErrorResponse(res, error);
	};

	apiController.use(publicApiErrorHandler);

	return apiController;
}

export const loadPublicApiVersions = async (
	publicApiEndpoint: string,
): Promise<{ apiRouters: express.Router[]; apiLatestVersion: number }> => {
	const folders = await fs.readdir(__dirname);
	const versions = folders.filter((folderName) => folderName.startsWith('v'));

	const apiRouters = versions.map((version) => {
		const openApiPath = path.join(__dirname, version, 'openapi.yml');
		return createApiRouter(version, openApiPath, __dirname, publicApiEndpoint);
	});

	const version = versions.pop()?.charAt(1);

	return {
		apiRouters,
		apiLatestVersion: version ? Number(version) : 1,
	};
};

export function isApiEnabled(): boolean {
	return !Container.get(GlobalConfig).publicApi.disabled && !Container.get(License).isAPIDisabled();
}
