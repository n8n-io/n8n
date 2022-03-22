
import {
	Application,
} from 'express';

import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';
import { Db } from '../..';

export interface N8nApp {
	app: Application;
}

const publicApiController = express.Router();

export const getRoutes = (): express.Router => {

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

						// if (!config.get('userManagement.isInstanceOwnerSetUp')) {
						// 	Logger.debug(
						// 		'Request to send email invite(s) to user(s) failed because the owner account is not set up',
						// 	);
						// 	throw new ResponseHelper.ResponseError(
						// 		'You must set up your own account before inviting others',
						// 		undefined,
						// 		400,
						// 	);
						// }

						// if (req.user.globalRole.name === 'owner') {


						// }

						req.user = user[0];

						return true;
					},
				},
			},	
		}));

	//add error handler
	//@ts-ignore
	publicApiController.use((err, req, res, next) => {
		res.status(err.status || 500).json({
			message: err.message,
			errors: err.errors,
		});

	});

	return publicApiController;
};