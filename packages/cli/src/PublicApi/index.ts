/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
import express, { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

import * as OpenApiValidator from 'express-openapi-validator';
import { HttpError } from 'express-openapi-validator/dist/framework/types';
import { OpenAPIV3 } from 'openapi-types';
import swaggerUi from 'swagger-ui-express';
import validator from 'validator';
import YAML from 'yamljs';

import config from '../../config';
import { Db, InternalHooksManager } from '..';
import { getInstanceBaseUrl } from '../UserManagement/UserManagementHelper';

function createApiRouter(
	version: string,
	openApiSpecPath: string,
	handlersDirectory: string,
	swaggerThemeCss: string,
	publicApiEndpoint: string,
): Router {
	const n8nPath = config.getEnv('path');
	const swaggerDocument = YAML.load(openApiSpecPath) as swaggerUi.JsonObject;
	// add the server depending on the config so the user can interact with the API
	// from the Swagger UI
	swaggerDocument.server = [
		{
			url: `${getInstanceBaseUrl()}/${publicApiEndpoint}/${version}}`,
		},
	];
	const apiController = express.Router();

	apiController.use(
		`/${publicApiEndpoint}/${version}/docs`,
		swaggerUi.serveFiles(swaggerDocument),
		swaggerUi.setup(swaggerDocument, {
			customCss: swaggerThemeCss,
			customSiteTitle: 'n8n Public API UI',
			customfavIcon: `${n8nPath}favicon.ico`,
		}),
	);

	apiController.use(`/${publicApiEndpoint}/${version}`, express.json());

	apiController.use(
		`/${publicApiEndpoint}/${version}`,
		OpenApiValidator.middleware({
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

	const apiRouters = versions.map((version) => {
		const openApiPath = path.join(__dirname, version, 'openapi.yml');
		return createApiRouter(version, openApiPath, __dirname, css, publicApiEndpoint);
	});

	return {
		apiRouters,
		apiLatestVersion: Number(versions.pop()?.charAt(1)) ?? 1,
	};
};
