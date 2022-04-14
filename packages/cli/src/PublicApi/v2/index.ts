/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable import/no-cycle */
import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { HttpError } from 'express-openapi-validator/dist/framework/types';

import { authenticationHandler } from '../helpers';

export const publicApiControllerV2 = express.Router();

const openApiSpec = path.join(__dirname, 'openapi.yml');

publicApiControllerV2.use('/v2/spec', express.static(openApiSpec));

publicApiControllerV2.use('/v2', express.json());

publicApiControllerV2.use(
	'/v2',
	OpenApiValidator.middleware({
		apiSpec: openApiSpec,
		operationHandlers: path.join(__dirname, '..'),
		validateRequests: true,
		validateApiSpec: true,
		validateSecurity: {
			handlers: {
				ApiKeyAuth: authenticationHandler,
			},
		},
	}),
);

// error handler
publicApiControllerV2.use(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	(error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
		return res.status(error.status || 400).json({
			message: error.message,
			// errors: error.errors,
		});
	},
);
