import { PathResolvingService, UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Router, ErrorRequestHandler, RequestHandler } from 'express';
import express from 'express';
import fs from 'fs/promises';
import type { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import type { JsonObject } from 'swagger-ui-express';

import { rememberRawBody } from '@/idempotency/idempotency-request';

import { PublicApiControllerRegistry } from './public-api-controller.registry';
import { PublicApiRateLimitSettingsService } from './public-api-rate-limit-settings.service';
import { stripGitBookParentTags } from './swagger-spec';
import { sendPublicApiErrorResponse } from './v1/public-api-error-response';

import { License } from '@/license';

import './v1/controllers';

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
	openApiDocument: OpenAPIV3.Document,
	basePath: string,
): OpenAPIV3.Document {
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

	const YAML = await import('yaml');
	const spec = await fs.readFile(openApiSpecPath, 'utf-8');
	const openApiDocument = YAML.parse(spec) as OpenAPIV3.Document;

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
			const openapiSpec = YAML.parse(spec) as JsonObject;
			const swaggerDocument = stripGitBookParentTags(openapiSpec);
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

function createPublicControllerMiddleware(version: string): RequestHandler {
	const router = express.Router({ mergeParams: true });
	Container.get(PublicApiControllerRegistry).activate(router, version);
	return router;
}

function createApiRouter(
	version: string,
	openApiSpecPath: string,
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

	apiController.get(`/${mountedPublicApiEndpoint}/${version}/openapi.yml`, async (_, res, next) => {
		// Public, read-only spec with no auth or sensitive data - safe to expose
		// cross-origin for documentation playgrounds
		res.header('Access-Control-Allow-Origin', '*');
		if (basePath === '/') {
			res.sendFile(openApiSpecPath);
			return;
		}

		try {
			const YAML = await import('yaml');
			const openApiDocument = await loadOpenApiDocument(openApiSpecPath, basePath);
			res.type('yaml').send(YAML.stringify(openApiDocument));
		} catch (error) {
			next(error);
		}
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

	// No route matched: the path is not part of the public API.
	const notFoundHandler: RequestHandler = (_req, res) => {
		res.status(404).json({ message: 'not found' });
	};

	apiController.use(
		`/${mountedPublicApiEndpoint}/${version}`,
		express.json({
			limit: payloadLimit,
			verify: (req, _res, buf) => {
				rememberRawBody(req, buf);
			},
		}),
		jsonParseErrorHandler,
		createPublicControllerMiddleware(version),
		notFoundHandler,
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

	await Container.get(PublicApiRateLimitSettingsService).load();

	const apiRouters = versions.map((version) => {
		const openApiPath = path.join(__dirname, version, 'openapi.yml');
		return createApiRouter(version, openApiPath, publicApiEndpoint, basePath);
	});

	const version = versions.pop()?.charAt(1);

	return {
		apiRouters,
		apiLatestVersion: version ? Number(version) : 1,
	};
};

/**
 * Whether API-key (token) based authentication is accepted on the public API.
 * Public API routes are always registered regardless of this flag — the UI
 * authenticates against them with the user's session cookie instead, which
 * must keep working even when token-based access is disabled.
 */
export function isApiKeyAuthEnabled(): boolean {
	return !Container.get(GlobalConfig).publicApi.disabled && !Container.get(License).isAPIDisabled();
}
