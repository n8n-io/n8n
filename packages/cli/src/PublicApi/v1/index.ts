/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable import/no-cycle */
import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { HttpError, OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';

import { Db } from '../..';

export const publicApiController = (): express.Router => {
	const openApiSpec = path.join(__dirname, 'openapi.yml');

	const apiController = express.Router();

	apiController.use('/v1/spec', express.static(openApiSpec));

	apiController.use('/v1', express.json());

	apiController.use(
		'/v1',
		OpenApiValidator.middleware({
			apiSpec: openApiSpec,
			operationHandlers: path.join(__dirname),
			validateRequests: true,
			validateApiSpec: true,
			validateSecurity: {
				handlers: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					ApiKeyAuth: async (req, scopes, schema: OpenAPIV3.ApiKeySecurityScheme) => {
						const apiKey = req.headers[schema.name.toLowerCase()];
						const user = await Db.collections.User?.findOne({
							where: {
								apiKey,
							},
							relations: ['globalRole'],
						});

						if (!user) {
							return false;
						}

						req.user = user;

						return true;
					},
				},
			},
		}),
	);

	// add error handler
	// @ts-ignore
	apiController.use(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
			return res.status(error.status || 400).json({
				message: error.message,
				// errors: error.errors,
			});
		},
	);

	return apiController;
};
