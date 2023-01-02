/* eslint-disable @typescript-eslint/naming-convention */
import express, { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

import type { HttpError } from 'express-openapi-validator/dist/framework/types';
import type { OpenAPIV3 } from 'openapi-types';
import type { JsonObject } from 'swagger-ui-express';

import config from '@/config';
import * as Db from '@/Db';
import { InternalHooksManager } from '@/InternalHooksManager';
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';

async function createApiRouter(
	version: string,
	openApiSpecPath: string,
	handlersDirectory: string,
	swaggerThemeCss: string,
	publicApiEndpoint: string,
): Promise<Router> {
	const n8nPath = config.getEnv('path');
	const YAML = await import('yamljs');
	const swaggerDocument = YAML.load(openApiSpecPath) as JsonObject;
	// add the server depending on the config so the user can interact with the API
	// from the Swagger UI
	swaggerDocument.server = [
		{
			url: `${getInstanceBaseUrl()}/${publicApiEndpoint}/${version}}`,
		},
	];
	const apiController = express.Router();

	if (!config.getEnv('publicApi.swaggerUi.disabled')) {
		const { serveFiles, setup } = await import('swagger-ui-express');

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

	const { default: validator } = await import('validator');
	const { middleware } = await import('express-openapi-validator');
	apiController.use(
		`/${publicApiEndpoint}/${version}`,
		express.json(),
		middleware({
			apiSpec: openApiSpecPath,
			operationHandlers: handlersDirectory,
			validateRequests: true,
			validateApiSpec: true,
			formats: [
				{
					name: 'email',
					type: 'string',
					validate: (email: string) => validator.isEmail(email),
				},
				{
					name: 'identifier',
					type: 'string',
					validate: (identifier: string) =>
						validator.isUUID(identifier) || validator.isEmail(identifier),
				},
				{
					name: 'jsonString',
					validate: (data: string) => {
						try {
							JSON.parse(data);
							return true;
						} catch (e) {
							return false;
						}
					},
				},
			],
			validateSecurity: {
				handlers: {
					ApiKeyAuth: async (
						req: express.Request,
						_scopes: unknown,
						schema: OpenAPIV3.ApiKeySecurityScheme,
					): Promise<boolean> => {
						const apiKey = req.headers[schema.name.toLowerCase()];
						const user = await Db.collections.User.findOne({
							where: { apiKey },
							relations: ['globalRole'],
						});

						if (!user) return false;

						void InternalHooksManager.getInstance().onUserInvokedApi({
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
	const swaggerThemePath = path.join(__dirname, 'swaggerTheme.css');
	const folders = await fs.readdir(__dirname);
	const css = (await fs.readFile(swaggerThemePath)).toString();
	const versions = folders.filter((folderName) => folderName.startsWith('v'));

	const apiRouters = await Promise.all(
		versions.map(async (version) => {
			const openApiPath = path.join(__dirname, version, 'openapi.yml');
			return createApiRouter(version, openApiPath, __dirname, css, publicApiEndpoint);
		}),
	);

	return {
		apiRouters,
		apiLatestVersion: Number(versions.pop()?.charAt(1)) ?? 1,
	};
};
