/* eslint-disable @typescript-eslint/naming-convention */
import type { Router } from 'express';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

import validator from 'validator';
import { middleware as openapiValidatorMiddleware } from 'express-openapi-validator';
import YAML from 'yamljs';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';
import type { OpenAPIV3 } from 'openapi-types';
import type { JsonObject } from 'swagger-ui-express';

import config from '@/config';
import * as Db from '@/Db';
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';

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
			url: `${getInstanceBaseUrl()}/${publicApiEndpoint}/${version}}`,
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

	apiController.get(`/${publicApiEndpoint}/${version}/openapi.yml`, (req, res) => {
		res.sendFile(openApiSpecPath);
	});

	apiController.use(
		`/${publicApiEndpoint}/${version}`,
		express.json(),
		openapiValidatorMiddleware({
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
						const apiKey = req.headers[schema.name.toLowerCase()] as string;
						const user = await Db.collections.User.findOne({
							where: { apiKey },
							relations: ['globalRole'],
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
			return createApiRouter(version, openApiPath, __dirname, publicApiEndpoint);
		}),
	);

	return {
		apiRouters,
		apiLatestVersion: Number(versions.pop()?.charAt(1)) ?? 1,
	};
};

function isApiEnabledByLicense(): boolean {
	const license = Container.get(License);
	return !license.isAPIDisabled();
}

export function isApiEnabled(): boolean {
	return !config.get('publicApi.disabled') && isApiEnabledByLicense();
}
