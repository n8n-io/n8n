import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Router, ErrorRequestHandler, RequestHandler } from 'express';
import type { OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';
import express from 'express';
import fs from 'fs/promises';
import { UnexpectedError } from 'n8n-workflow';
import path from 'path';
import type { JsonObject } from 'swagger-ui-express';
import validator from 'validator';

import { PublicApiControllerRegistry } from './public-api-controller.registry';
import { sendPublicApiErrorResponse } from './v1/public-api-error-response';

import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { createN8nPackageMulterOptions } from '@/modules/n8n-packages/utils/import-package-upload';
import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { LastActiveAtService } from '@/services/last-active-at.service';
import { PathResolvingService } from '@/services/path-resolving.service';
import { UrlService } from '@/services/url.service';

import './v1/controllers/tags.public.controller';

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

function joinUrlPaths(prefix: string, urlPath: string) {
	const normalizedPrefix = prefix === '/' ? '' : prefix.replace(/\/+$/, '');
	const normalizedPath = urlPath.replace(/^\/+/, '');

	return normalizedPath ? `${normalizedPrefix}/${normalizedPath}` : normalizedPrefix || '/';
}

function stripLeadingSlash(urlPath: string) {
	return urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
}

export function patchOpenApiServers(
	openApiDocument: OpenAPIV3.DocumentV3,
	basePath: string,
): OpenAPIV3.DocumentV3 {
	if (basePath === '/') return openApiDocument;

	return {
		...openApiDocument,
		servers: openApiDocument.servers?.map((server) => ({
			...server,
			url: server.url.startsWith('/') ? joinUrlPaths(basePath, server.url) : server.url,
		})),
	};
}

async function loadOpenApiDocument(openApiSpecPath: string, basePath: string) {
	if (basePath === '/') return openApiSpecPath;

	const { bundle } = await import('@apidevtools/json-schema-ref-parser');
	const openApiDocument = await bundle<OpenAPIV3.DocumentV3>(openApiSpecPath);

	return patchOpenApiServers(openApiDocument, basePath);
}

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

function createLazySwaggerMiddleware(openApiSpecPath: string, version: string): RequestHandler {
	let cachedRouter: Router | undefined;

	return async (req, res, next) => {
		if (!cachedRouter) {
			const globalConfig = Container.get(GlobalConfig);
			const pathResolvingService = Container.get(PathResolvingService);
			const urlBasePath = pathResolvingService.getUrlBasePath();
			const faviconPath = joinUrlPaths(urlBasePath, 'favicon.ico');

			const YAML = await import('yaml');
			const spec = await fs.readFile(openApiSpecPath, 'utf-8');
			const swaggerDocument = YAML.parse(spec) as JsonObject;
			// add the server depending on the config so the user can interact with the API
			// from the Swagger UI.
			// `getInstanceBaseUrl()` already includes the configured base path, so we must
			// combine it with the *bare* public API endpoint name to avoid double-prefixing.
			const bareApiEndpoint = globalConfig.publicApi.path;
			swaggerDocument.servers = [
				{
					url: `${Container.get(UrlService).getInstanceBaseUrl()}/${bareApiEndpoint}/${version}`,
				},
			];

			const { serveFiles, setup } = await import('swagger-ui-express');
			const swaggerThemePath = path.join(__dirname, 'swagger-theme.css');
			const swaggerThemeCss = await fs.readFile(swaggerThemePath, { encoding: 'utf-8' });

			const swaggerSetupOpts = {
				customCss: swaggerThemeCss,
				customSiteTitle: 'n8n Public API UI',
				customfavIcon: faviconPath,
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

// Minimal shapes of the express-openapi-validator resolver arguments we depend on.
interface EovRoute {
	basePath: string;
	expressRoute: string;
	openApiRoute: string;
	method: string;
}
interface EovOperation {
	operationId?: string;
	// eslint-disable-next-line @typescript-eslint/naming-convention -- OpenAPI vendor extension keys
	'x-eov-operation-id'?: string;
	// eslint-disable-next-line @typescript-eslint/naming-convention -- OpenAPI vendor extension keys
	'x-eov-operation-handler'?: string;
}
interface EovApiDoc {
	paths?: Record<string, Record<string, EovOperation>>;
}

/**
 * Test-only express-openapi-validator operation-handler resolver. It is wired in **only** under
 * Vitest (see `operationHandlers` below); production and e2e keep eov's default string resolver
 * and its synchronous `require()`, so runtime behaviour is unchanged.
 *
 * Why it's needed in tests: eov's default resolver `require()`s each handler module, but under
 * Vitest only the `.ts` handler sources exist on disk (no `.js`) and they're served by Vite, not
 * Node's `require` — so `require()` throws and every route 500s.
 * */
async function importOperationHandlerResolver(
	handlersPath: string,
	// Typed as `unknown` (then narrowed) so the signature stays assignable to eov's
	// `resolver` type, whose `route`/`apiDoc` params are its own internal interfaces.
	routeArg: unknown,
	apiDocArg: unknown,
): Promise<unknown> {
	const route = routeArg as EovRoute;
	const apiDoc = apiDocArg as EovApiDoc;
	const pathKey = route.openApiRoute.substring(route.basePath.length);
	const operation = apiDoc.paths?.[pathKey]?.[route.method.toLowerCase()];
	const operationId = operation?.['x-eov-operation-id'] ?? operation?.operationId;
	const handlerModule = operation?.['x-eov-operation-handler'];

	if (!operationId || !handlerModule) {
		throw new UnexpectedError(
			`Missing operation id or handler for [${route.method}] ${route.expressRoute}`,
		);
	}

	const modulePath = path.join(handlersPath, handlerModule);
	// `@vite-ignore`: the path is fully dynamic, so Vite's `dynamic-import-vars` plugin can't
	// analyze it (it throws during transform when this module is loaded under Vitest). Skipping
	// analysis leaves a plain runtime `import()`, which the test runner and the prod CJS build
	// (downleveled to `require`) both resolve.
	const imported = (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown> & {
		default?: Record<string, unknown>;
	};
	const handler = imported[operationId] ?? imported.default?.[operationId] ?? imported.default;

	if (!handler) {
		throw new UnexpectedError(`Could not find handler '${operationId}' in module '${modulePath}'`);
	}

	return handler;
}

function createPublicControllerMiddleware(version: string): RequestHandler {
	const router = express.Router({ mergeParams: true });
	Container.get(PublicApiControllerRegistry).activate(router, version);
	return router;
}

function createLazyValidatorMiddleware(
	openApiSpecPath: string,
	handlersDirectory: string,
	version: string,
	basePath: string,
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
				const openApiDocument = await loadOpenApiDocument(openApiSpecPath, basePath);

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
						apiSpec: openApiDocument,
						// Production/e2e use eov's default resolver (synchronous `require`). Under Vitest,
						// where handler modules are `.ts` served by Vite, swap in an `import()`-based
						// resolver so route handlers can load. See `importOperationHandlerResolver`.
						operationHandlers: process.env.VITEST
							? { basePath: handlersDirectory, resolver: importOperationHandlerResolver }
							: handlersDirectory,
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
	basePath: string,
): Router {
	const globalConfig = Container.get(GlobalConfig);
	const payloadLimit = `${globalConfig.endpoints.payloadSizeMax}mb`;
	const apiController = express.Router();
	const mountedPublicApiEndpoint = stripLeadingSlash(joinUrlPaths(basePath, publicApiEndpoint));

	if (!globalConfig.publicApi.swaggerUiDisabled) {
		apiController.use(
			`/${mountedPublicApiEndpoint}/${version}/docs`,
			createLazySwaggerMiddleware(openApiSpecPath, version),
		);
	}

	apiController.get(`/${mountedPublicApiEndpoint}/${version}/openapi.yml`, (_, res) => {
		// Public, read-only spec with no auth or sensitive data - safe to expose
		// cross-origin for documentation playgrounds
		res.header('Access-Control-Allow-Origin', '*');
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
		`/${mountedPublicApiEndpoint}/${version}`,
		express.json({ limit: payloadLimit }),
		jsonParseErrorHandler,
		createPublicControllerMiddleware(version),
		createLazyValidatorMiddleware(openApiSpecPath, handlersDirectory, version, basePath),
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
	basePath: string = Container.get(PathResolvingService).getBasePath(),
): Promise<{ apiRouters: express.Router[]; apiLatestVersion: number }> => {
	const folders = await fs.readdir(__dirname);
	const versions = folders.filter((folderName) => folderName.startsWith('v'));

	const apiRouters = versions.map((version) => {
		const openApiPath = path.join(__dirname, version, 'openapi.yml');
		return createApiRouter(version, openApiPath, __dirname, publicApiEndpoint, basePath);
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
