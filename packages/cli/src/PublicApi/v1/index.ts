
import {
	Application,
} from 'express';

import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { HttpError, OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';
import { Db, ResponseHelper } from '../..';
import config = require('../../../config');

export interface N8nApp {
	app: Application;
}

export const publicApiController = express.Router();

publicApiController.use(`/v1`,
	OpenApiValidator.middleware({
		apiSpec: path.join(__dirname, 'openapi.yml'),
		operationHandlers: path.join(__dirname),
		validateRequests: true, // (default)
		validateApiSpec: true,
		validateSecurity: {
			handlers: {
				ApiKeyAuth: async (req, scopes, schema: OpenAPIV3.ApiKeySecurityScheme) => {

					const apiKey = req.headers[schema.name.toLowerCase()];

					const user = await Db.collections.User!.find({
						where: {
							apiKey,
						},
						relations: ['globalRole'],
					});

					if (!user.length) {
						return false;
					}

					if (!config.get('userManagement.isInstanceOwnerSetUp')) {
						throw {
							message: 'asasasas',
							status: 400,
						};
					}

					if (user[0].globalRole.name !== 'owner') {
						throw {
							status: 403,
						};
					}

					req.user = user[0];

					return true;
				},
			},
		},
	}));

//add error handler
//@ts-ignore
publicApiController.use((err: HttpError, req, res, next) => {
	res.status(err.status || 500).json({
		message: err.message,
		errors: err.errors,
	});

});

// export const getRoutes = (): express.Router => {



// 	return publicApiController;
// };