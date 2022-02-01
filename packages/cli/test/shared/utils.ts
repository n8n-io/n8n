import express = require('express');
import * as superagent from 'superagent';
import * as request from 'supertest';
import { URL } from 'url';
import bodyParser = require('body-parser');
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import config = require('../../config');
import { Role } from '../../src/databases/entities/Role';
import { AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT } from './constants';
import { addRoutes as authMiddleware } from '../../src/UserManagement/routes';
import { authenticationMethods as loginEndpoints } from '../../src/UserManagement/routes/auth';
import { Db } from '../../src';
import { genSaltSync, hashSync } from 'bcryptjs';
import { User } from '../../src/databases/entities/User';
import { meNamespace as meEndpoints } from '../../src/UserManagement/routes/me';
import { usersNamespace as usersEndpoints } from '../../src/UserManagement/routes/users';
import { getConnection } from 'typeorm';
import { issueJWT } from '../../src/UserManagement/auth/jwt';

export const isTestRun = process.argv[1].split('/').pop() === 'jest';

/**
 * Initialize a test server with auth middleware and login routes.
 * Optionally, pass in namespaces of endpoints to enable.
 */
export const initTestServer = (
	namespaces: { [K in 'meEndpoints' | 'usersEndpoints']?: true } = {},
) => {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', 'My JWT secret');
	config.set('userManagement.hasOwner', false);

	authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);

	loginEndpoints.apply(testServer); // required for cookies

	if (namespaces.meEndpoints) meEndpoints.apply(testServer);
	if (namespaces.usersEndpoints) usersEndpoints.apply(testServer);

	return testServer.app;
};

/**
 * Initialize a sqlite DB with test connection settings.
 */
export const initTestDb = async () => {
	await Db.init();
	await getConnection().runMigrations({ transaction: 'none' });
};

/**
 * Create an agent for a user holding an `n8n-auth` cookie.
 */
export async function createAgent(app: express.Application, user: User) {
	const userAgent = request.agent(app);
	userAgent.use(restPrefix);

	const { token } = await issueJWT(user);
	userAgent.jar.setCookie(`n8n-auth=${token}`);

	return userAgent;
}

/**
 * Log all the routes mounted on the test server app, for debugging.
 */
export const logRoutes = (app: express.Application) => {
	app._router.stack.forEach((r: { route?: { path?: string } }) => {
		if (r?.route?.path) console.log(r.route.path);
	});
};

export const expectMemberGlobalRole = (globalRole: Role) => {
	expect(globalRole.name).toBe('member');
	expect(globalRole.scope).toBe('global');
};

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
