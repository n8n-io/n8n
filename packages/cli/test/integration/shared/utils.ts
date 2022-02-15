import express = require('express');
import * as superagent from 'superagent';
import * as request from 'supertest';
import { URL } from 'url';
import bodyParser = require('body-parser');
import * as util from 'util';
import { createTestAccount } from 'nodemailer';
import { v4 as uuid } from 'uuid';
import { LoggerProxy } from 'n8n-workflow';

import config = require('../../../config');
import { AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT } from './constants';
import { addRoutes as authMiddleware } from '../../../src/UserManagement/routes';
import { Db, IDatabaseCollections } from '../../../src';
import { User } from '../../../src/databases/entities/User';
import { meNamespace as meEndpoints } from '../../../src/UserManagement/routes/me';
import { usersNamespace as usersEndpoints } from '../../../src/UserManagement/routes/users';
import { authenticationMethods as authEndpoints } from '../../../src/UserManagement/routes/auth';
import { ownerNamespace as ownerEndpoints } from '../../../src/UserManagement/routes/owner';
import { passwordResetNamespace as passwordResetEndpoints } from '../../../src/UserManagement/routes/passwordReset';
import { getConnection } from 'typeorm';
import { issueJWT } from '../../../src/UserManagement/auth/jwt';
import { randomEmail, randomValidPassword, randomName } from './random';
import type { EndpointNamespace, NamespacesMap, SmtpTestAccount } from './types';
import { Role } from '../../../src/databases/entities/Role';
import { getLogger } from '../../../src/Logger';

// ----------------------------------
//            test server
// ----------------------------------

export const initLogger = () => {
	config.set('logs.output', 'file'); // declutter console output during tests
	LoggerProxy.init(getLogger());
};

/**
 * Initialize a test server to make requests to.
 *
 * @param applyAuth Whether to apply auth middleware to the test server.
 * @param namespaces Namespaces of endpoints to apply to the test server.
 */
export function initTestServer({
	applyAuth,
	namespaces,
}: {
	applyAuth: boolean;
	namespaces?: EndpointNamespace[];
}) {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', 'My JWT secret');
	config.set('userManagement.hasOwner', false);

	if (applyAuth) {
		authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);
	}

	if (namespaces) {
		const map: NamespacesMap = {
			me: meEndpoints,
			users: usersEndpoints,
			auth: authEndpoints,
			owner: ownerEndpoints,
			passwordReset: passwordResetEndpoints,
		};

		for (const namespace of namespaces) {
			map[namespace].apply(testServer);
		}
	}

	return testServer.app;
}

// ----------------------------------
//            test DB
// ----------------------------------

export async function initTestDb() {
	await Db.init();
	await getConnection().runMigrations({ transaction: 'none' });
}

export async function truncate(entities: Array<keyof IDatabaseCollections>) {
	await getConnection().query('PRAGMA foreign_keys=OFF');
	await Promise.all(entities.map((entity) => Db.collections[entity]!.clear()));
	await getConnection().query('PRAGMA foreign_keys=ON');
}

/**
 * Store a user in the DB, defaulting to a `member`.
 */
export async function createUser(
	{
		id,
		email,
		password,
		firstName,
		lastName,
		role,
	}: {
		id: string;
		email: string;
		password: string;
		firstName: string;
		lastName: string;
		role?: Role;
	} = {
		id: uuid(),
		email: randomEmail(),
		password: randomValidPassword(),
		firstName: randomName(),
		lastName: randomName(),
	},
) {
	return await Db.collections.User!.save({
		id,
		email,
		password,
		firstName,
		lastName,
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: role ?? (await getGlobalMemberRole()),
	});
}

export async function createOwnerShell() {
	await Db.collections.User!.save({
		id: uuid(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: await getGlobalOwnerRole(),
	});
}

export async function getGlobalOwnerRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'global',
	});
}

export async function getGlobalMemberRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'member',
		scope: 'global',
	});
}

export async function getWorkflowOwnerRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'workflow',
	});
}

export async function getCredentialOwnerRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'credential',
	});
}

export function getAllRoles() {
	return Promise.all([
		getGlobalOwnerRole(),
		getGlobalMemberRole(),
		getWorkflowOwnerRole(),
		getCredentialOwnerRole(),
	]);
}


// ----------------------------------
//           request agent
// ----------------------------------

export async function createAgent(
	app: express.Application,
	{ auth, user }: { auth: boolean; user?: User } = { auth: false },
) {
	const agent = request.agent(app);
	agent.use(prefix(REST_PATH_SEGMENT));

	if (auth && !user) {
		throw new Error('User required for auth agent creation');
	}

	if (auth && user) {
		const { token } = await issueJWT(user);
		agent.jar.setCookie(`n8n-auth=${token}`);
	}

	return agent;
}

/**
 * Plugin to prefix a path segment into a request URL pathname.
 *
 * Example: http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
export function prefix(pathSegment: string) {
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
}

/**
 * Extract the value (token) of the auth cookie in a response.
 */
export function getAuthToken(response: request.Response, authCookieName = 'n8n-auth') {
	const cookies: string[] = response.headers['set-cookie'];

	if (!cookies) {
		throw new Error("No 'set-cookie' header found in response");
	}

	const authCookie = cookies.find((c) => c.startsWith(`${authCookieName}=`));

	if (!authCookie) return undefined;

	const match = authCookie.match(new RegExp(`(^| )${authCookieName}=(?<token>[^;]+)`));

	if (!match || !match.groups) return undefined;

	return match.groups.token;
}

// ----------------------------------
//            settings
// ----------------------------------

export async function getHasOwnerSetting() {
	const { value } = await Db.collections.Settings!.findOneOrFail({
		key: 'userManagement.hasOwner',
	});

	return Boolean(value);
}

// ----------------------------------
//              SMTP
// ----------------------------------

/**
 * Get an SMTP test account from https://ethereal.email to test sending emails.
 */
export const getSmtpTestAccount = util.promisify<SmtpTestAccount>(createTestAccount);

// TODO: Phase out
export const isTestRun = process.argv[1].split('/').includes('jest');
