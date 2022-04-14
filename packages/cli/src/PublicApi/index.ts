/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable import/no-cycle */
import express, { Router } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import { HttpError } from 'express-openapi-validator/dist/framework/types';
import fs from 'fs/promises';
import path from 'path';
import { authenticationHandler, specFormats } from './helpers';

function createApiRouter(
	version: string,
	openApiSpecPath: string,
	hanldersDirectory: string,
): Router {
	const apiController = express.Router();
	apiController.use(`/${version}/spec`, express.static(openApiSpecPath));
	apiController.use(`/${version}`, express.json());
	apiController.use(
		`/${version}`,
		OpenApiValidator.middleware({
			apiSpec: openApiSpecPath,
			operationHandlers: hanldersDirectory,
			validateRequests: true,
			validateApiSpec: true,
			formats: specFormats(),
			validateSecurity: {
				handlers: {
					ApiKeyAuth: authenticationHandler,
				},
			},
		}),
	);
	apiController.use(
		(error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
			return res.status(error.status || 400).json({
				message: error.message,
			});
		},
	);
	return apiController;
}

export const loadPublicApiVersions = async (): Promise<express.Router[]> => {
	const data = await fs.readdir(__dirname);
	const versions = data.filter((folderName) => folderName.startsWith('v'));
	const apiRouters: express.Router[] = [];
	for (const version of versions) {
		const openApiPath = path.join(__dirname, version, 'openapi.yml');
		apiRouters.push(createApiRouter(version, openApiPath, __dirname));
	}
	return apiRouters;
};
