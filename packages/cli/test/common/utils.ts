import express = require('express');
import * as superagent from 'superagent';
import { URL } from 'url';
import bodyParser = require('body-parser');
import validator from 'validator';

import config = require('../../config');
import { Role } from '../../src/databases/entities/Role';
import { AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT } from './constants';
import { addRoutes as authMiddleware } from '../../src/UserManagement/routes';
import { authenticationMethods as loginRoutes } from '../../src/UserManagement/routes/auth';

/**
 * Initialize a test server with auth middleware and login routes.
 */
export const initTestServer = () => {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', 'My JWT secret');

	authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);
	loginRoutes.apply(testServer);

	return testServer;
};

/**
 * Log all the routes mounted on the test server app, for debugging.
 */
export const logRoutes = (app: express.Application) => {
	app._router.stack.forEach((r: { route?: { path?: string } }) => {
		if (r?.route?.path) console.log(r.route.path);
	});
};

export const expectOwnerGlobalRole = (globalRole: Role) => {
	expect(globalRole.id).toBe(1); // TODO: Will this always be true?
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expectIso8601Date(globalRole.createdAt);
	expectIso8601Date(globalRole.updatedAt);
};

const expectIso8601Date = (date: Date) =>
	expect(validator.isISO8601(date.toString(), { strict: true })).toBe(true);

/**
 * Plugin to prefix a path segment into a request URL pathname.
 *
 * Example:
 * http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
const prefix = (pathSegment: string) => {
	return function (request: superagent.SuperAgentRequest) {
		const url = new URL(request.url);

		// enforce consistency at call sites
		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}

		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();

		return request;
	};
};

export const restPrefix = prefix(REST_PATH_SEGMENT);
