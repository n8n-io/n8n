import { Application, Response } from 'express';

import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { HttpError, OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';
import * as bodyParser from 'body-parser';
import * as SwaggerParser from '@apidevtools/swagger-parser';
// eslint-disable-next-line import/no-cycle
import { Db } from '../..';
import config = require('../../../config');

import { middlewares } from '../middlewares';

export interface N8nApp {
	app: Application;
}

type OperationID = 'getUsers' | 'getUser' | undefined;

export const publicApiController = express.Router();

publicApiController.use(bodyParser.json());

void (async () => {
	const { paths = {} } = await SwaggerParser.parse(path.join(__dirname, 'openapi.yml'));
	Object.entries(paths).forEach(([routePath, methods]) => {
		Object.entries(methods).forEach(([method, data]) => {
			const operationId: OperationID = (
				data as {
					'x-eov-operation-id': OperationID;
				}
			)['x-eov-operation-id'];
			if (operationId) {
				if (method === 'get') {
					publicApiController.get(
						routePath.replace(/\{([^}]+)}/g, ':$1'),
						...middlewares[operationId],
					);
				}
			}
		});
	});

	publicApiController.use(
		'/',
		OpenApiValidator.middleware({
			apiSpec: path.join(__dirname, 'openapi.yml'),
			operationHandlers: path.join(__dirname),
			validateRequests: true,
			validateApiSpec: true,
			validateSecurity: {
				handlers: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					ApiKeyAuth: async (req, scopes, schema: OpenAPIV3.ApiKeySecurityScheme) => {
						const apiKey = req.headers[schema.name.toLowerCase()];

						const user = await Db.collections.User?.find({
							where: {
								apiKey,
							},
							relations: ['globalRole'],
						});

						if (!user?.length) {
							return false;
						}

						if (!config.get('userManagement.isInstanceOwnerSetUp')) {
							// eslint-disable-next-line @typescript-eslint/no-throw-literal
							throw {
								status: 400,
							};
						}

						if (config.get('userManagement.disabled')) {
							// eslint-disable-next-line @typescript-eslint/no-throw-literal
							throw {
								status: 400,
							};
						}

						if (user[0].globalRole.name !== 'owner') {
							// eslint-disable-next-line @typescript-eslint/no-throw-literal
							throw {
								status: 403,
							};
						}

						[req.user] = user;

						return true;
					},
				},
			},
		}),
	);

	// add error handler
	// @ts-ignore
	publicApiController.use((error: HttpError, req, res: Response) => {
		res.status(error.status || 500).json({
			message: error.message,
			errors: error.errors,
		});
	});
})();
