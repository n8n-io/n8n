
import { Application, response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');
import { Db, ResponseHelper } from '../../..';

import { sanitizeUser } from '../../../UserManagement/UserManagementHelper';

export interface N8nApp {
	app: Application;
}
export function addRoutes(this: N8nApp, publicApiEndpoint: string): void {

	// console.log('se llamo esta vegra');

	// console.log(path.join(__dirname));

	// console.log(path.join(__dirname, '..' ,`openapi.yml`));

	this.app.use(`/${publicApiEndpoint}/v1`,
		OpenApiValidator.middleware({
			apiSpec: path.join(__dirname, '..', 'openapi.yml'),
			operationHandlers: path.join(__dirname, '..'),
			validateRequests: true, // (default)
			validateApiSpec: true,
			validateSecurity: {
				handlers: {
					ApiKeyAuth: async (req, scopes, schema) => {
						//@ts-ignore
						const apiKey = req.headers[schema?.name.toLowerCase()];
						//@ts-ignore
						const user = await Db.collections.User!.findOne({ apiKey });
						
						if (user === undefined) {
							return false;
						}

						req.user = sanitizeUser(user);

						return true;
					},
				},
			},		
		}),
	);

	//@ts-ignore
	this.app.use((err, req, res, next) => {
		// format error
		res.status(err.status || 500).json({
			message: err.message,
			errors: err.errors,
		});
	});
}
