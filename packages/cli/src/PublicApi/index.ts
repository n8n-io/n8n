/* eslint-disable @typescript-eslint/naming-convention */
import { Container } from 'typedi';
import type { Router } from 'express';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

import validator from 'validator';
import YAML from 'yamljs';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';
import type { OpenAPIV3 } from 'openapi-types';
import type { JsonObject } from 'swagger-ui-express';

import config from '@/config';

import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import { UserRepository } from '@db/repositories/user.repository';
import { UrlService } from '@/services/url.service';
import type { AuthenticatedRequest } from '@/requests';

async function createApiRouter(
	version: string,
	openApiSpecPath: string,
	handlersDirectory: string,
	publicApiEndpoint: string,
): Promise<Router> {
	const n8nPath = config.getEnv('path');
	const swaggerDocument = YAML.load(openApiSpecPath) as JsonObject;
	// add the server depending on the config so the user can interact with the API
	// from the Swagger UI
	swaggerDocument.server = [
		{
			url: `${Container.get(UrlService).getInstanceBaseUrl()}/${publicApiEndpoint}/${version}}`,
		},
	];
	const apiController = express.Router();

	if (!config.getEnv('publicApi.swaggerUi.disabled')) {
		const { serveFiles, setup } = await import('swagger-ui-express');
		const swaggerThemePath = path.join(__dirname, 'swaggerTheme.css');
		const swaggerThemeCss = await fs.readFile(swaggerThemePath, { encoding: 'utf-8' });

		apiController.use(
			`/${publicApiEndpoint}/${version}/docs`,
			serveFiles(swaggerDocument),
			setup(swaggerDocument, {
				customCss: swaggerThemeCss,
				customSiteTitle: 'n8n Public API UI',
				customfavIcon: `${n8nPath}favicon.ico`,
			}),
		);
	}

	apiController.get(`/${publicApiEndpoint}/${version}/openapi.yml`, (_, res) => {
		res.sendFile(openApiSpecPath);
	});

	const { middleware: openApiValidatorMiddleware } = await import('express-openapi-validator');
	apiController.use(
		`/${publicApiEndpoint}/${version}`,
		express.json(),
		openApiValidatorMiddleware({
			apiSpec: openApiSpecPath,
			operationHandlers: handlersDirectory,
			validateRequests: true,
			validateApiSpec: true,
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
			},
			validateSecurity: {
				handlers: {
					ApiKeyAuth: async (
						req: AuthenticatedRequest,
						_scopes: unknown,
						schema: OpenAPIV3.ApiKeySecurityScheme,
					): Promise<boolean> => {
						const apiKey = req.headers[schema.name.toLowerCase()] as string;
						const user = await Container.get(UserRepository).findOne({
							where: { apiKey },
						});

						if (!user) return false;

						void Container.get(InternalHooks).onUserInvokedApi({
							user_id: user.id,
							path: req.path,
							method: req.method,
							api_version: version,
						});

						req.user = user;

						return true;
					},
				},
			},
		}),
	);

	apiController.use(
		(
			error: HttpError,
			_req: express.Request,
			res: express.Response,
			_next: express.NextFunction,
		) => {
			return res.status(error.status || 400).json({
				message: error.message,
			});
		},
	);

	return apiController;
}

export const loadPublicApiVersions = async (
	publicApiEndpoint: string,
): Promise<{ apiRouters: express.Router[]; apiLatestVersion: number }> => {
	const folders = await fs.readdir(__dirname);
	const versions = folders.filter((folderName) => folderName.startsWith('v'));

	const apiRouters = await Promise.all(
		versions.map(async (version) => {
			const openApiPath = path.join(__dirname, version, 'openapi.yml');
			return await createApiRouter(version, openApiPath, __dirname, publicApiEndpoint);
		}),
	);

	const version = versions.pop()?.charAt(1);

	return {
		apiRouters,
		apiLatestVersion: version ? Number(version) : 1,
	};
};

export function isApiEnabled(): boolean {
	return !config.get('publicApi.disabled') && !Container.get(License).isAPIDisabled();
}
