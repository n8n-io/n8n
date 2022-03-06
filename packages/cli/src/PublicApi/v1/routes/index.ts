
import { Application, response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');
import { Db, ResponseHelper } from '../../..';

import { sanitizeUser } from '../../../UserManagement/UserManagementHelper';

import { OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';
export interface N8nApp {
	app: Application;
}
export function addRoutes(this: N8nApp, publicApiEndpoint: string): void {

	this.app.use(`/${publicApiEndpoint}/v1`,
		OpenApiValidator.middleware({
			apiSpec: path.join(__dirname, '..', 'openapi.yml'),
			operationHandlers: path.join(__dirname, '..'),
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

						req.user = sanitizeUser(user[0]);

						return true;
					},
				},
			},		
		}),
	);

	//@ts-ignore
	this.app.use((err, req, res, next) => {
		console.log(err);

		// format error
		res.status(err.status || 500).json({
			message: err.message,
			errors: err.errors,
		});
	});
}
