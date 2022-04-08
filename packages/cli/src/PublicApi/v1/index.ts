/* eslint-disable import/no-cycle */
import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { HttpError } from 'express-openapi-validator/dist/framework/types';
import passport = require('passport');
import { Strategy } from 'passport-http-header-strategy';
import { VerifiedCallback } from 'passport-jwt';
import { Db } from '../..';
import { middlewares } from '../middlewares';
import { addCustomMiddlewares, IMiddlewares } from '../helpers';

export const publicApiController = (async (): Promise<express.Router> => {
	const openApiSpec = path.join(__dirname, 'openapi.yml');

	const apiController = express.Router();

	apiController.use('/spec', express.static(openApiSpec));

	apiController.use(express.json());

	passport.use(
		new Strategy(
			{ header: 'X-N8N-API-KEY', passReqToCallback: false },
			async (token: string, done: VerifiedCallback) => {
				const user = await Db.collections.User?.findOne({
					where: {
						apiKey: token,
					},
					relations: ['globalRole'],
				});

				if (!user) {
					return done(null, false);
				}

				return done(null, user);
			},
		),
	);

	// add authentication middlewlares
	apiController.use('/', passport.authenticate('header', { session: false }));

	await addCustomMiddlewares(apiController, openApiSpec, middlewares as unknown as IMiddlewares);

	apiController.use(
		OpenApiValidator.middleware({
			apiSpec: openApiSpec,
			operationHandlers: path.join(__dirname),
			validateRequests: true,
			validateApiSpec: true,
			validateSecurity: false,
		}),
	);

	// add error handler
	// @ts-ignore
	apiController.use(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
			return res.status(error.status || 500).json({
				message: error.message,
				errors: error.errors,
			});
		},
	);

	return apiController;
})();
