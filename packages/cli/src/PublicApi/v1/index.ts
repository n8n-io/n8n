
import {
	Application,
} from 'express';

import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

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