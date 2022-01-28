import bodyParser = require('body-parser');
import express = require('express');
import request = require('superagent');
import { URL } from 'url';

import config = require('../config');
import { Role } from '../src/databases/entities/Role';
import { AUTH_MIDDLEWARE_ARGS, REST_PATH_SEGMENT, TEST_JWT_SECRET } from './constants';
import { addRoutes as authMiddleware } from '../src/UserManagement/routes';
import { authenticationMethods as loginRoutes } from '../src/UserManagement/routes/auth';

export const initTestServer = () => {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', TEST_JWT_SECRET);
	authMiddleware.apply(testServer, AUTH_MIDDLEWARE_ARGS);
	loginRoutes.apply(testServer);

	return testServer;
};

/**
 * Validate that a role in a response corresponds to a global owner.
 */
export const expectOwnerGlobalRole = (globalRole: Role) => {
	expect(globalRole.id).toBe(1);
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(typeof globalRole.createdAt).toBe('string');
	expect(typeof globalRole.updatedAt).toBe('string');
};

/**
 * Log all the routes mounted on the test server app, for debugging.
 */
export const logRoutes = (app: express.Application) => {
	app._router.stack.forEach((r: { route?: { path?: string } }) => {
		if (r?.route?.path) console.log(r.route.path);
	});
};

/**
 * Prefix a path segment into the pathname of a request URL.
 */
const prefixPathname = (pathSegment: string) => {
	return function (request: request.SuperAgentRequest) {
		const url = new URL(request.url);

		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}

		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();

		return request;
	};
};

/**
 * Plugin to prefix the base n8n REST API path segment into the pathname of a request URL.
 *
 * Example:
 * http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
export const restPrefix = prefixPathname(REST_PATH_SEGMENT);
