import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import express = require('express');
import * as superagent from 'superagent';
import * as request from 'supertest';
import { URL } from 'url';
import bodyParser = require('body-parser');
import * as util from 'util';
import { createTestAccount } from 'nodemailer';
import { INodeTypes, LoggerProxy } from 'n8n-workflow';
import { UserSettings } from 'n8n-core';

import config = require('../../../config');
import { AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT } from './constants';
import { AUTH_COOKIE_NAME } from '../../../src/constants';
import { addRoutes as authMiddleware } from '../../../src/UserManagement/routes';
import { Db, ExternalHooks, InternalHooksManager } from '../../../src';
import { meNamespace as meEndpoints } from '../../../src/UserManagement/routes/me';
import { usersNamespace as usersEndpoints } from '../../../src/UserManagement/routes/users';
import { authenticationMethods as authEndpoints } from '../../../src/UserManagement/routes/auth';
import { ownerNamespace as ownerEndpoints } from '../../../src/UserManagement/routes/owner';
import { passwordResetNamespace as passwordResetEndpoints } from '../../../src/UserManagement/routes/passwordReset';
import { issueJWT } from '../../../src/UserManagement/auth/jwt';
import { getLogger } from '../../../src/Logger';
import { credentialsController } from '../../../src/api/credentials.api';

import type { User } from '../../../src/databases/entities/User';
import { Telemetry } from '../../../src/telemetry';
import type { EndpointGroup, SmtpTestAccount } from './types';
import type { N8nApp } from '../../../src/UserManagement/Interfaces';

/**
 * Initialize a test server.
 *
 * @param applyAuth Whether to apply auth middleware to test server.
 * @param endpointGroups Groups of endpoints to apply to test server.
 */
export function initTestServer({
	applyAuth,
	endpointGroups,
}: {
	applyAuth: boolean;
	endpointGroups?: EndpointGroup[];
}) {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
		...(endpointGroups?.includes('credentials') ? { externalHooks: ExternalHooks() } : {}),
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', 'My JWT secret');
	config.set('userManagement.isInstanceOwnerSetUp', false);

	if (applyAuth) {
		authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);
	}

	if (!endpointGroups) return testServer.app;

	const [routerEndpoints, functionEndpoints] = classifyEndpointGroups(endpointGroups);

	if (routerEndpoints.length) {
		const map: Record<string, express.Router> = {
			credentials: credentialsController,
		};

		for (const group of routerEndpoints) {
			testServer.app.use(`/${testServer.restEndpoint}/${group}`, map[group]);
		}
	}

	if (functionEndpoints.length) {
		const map: Record<string, (this: N8nApp) => void> = {
			me: meEndpoints,
			users: usersEndpoints,
			auth: authEndpoints,
			owner: ownerEndpoints,
			passwordReset: passwordResetEndpoints,
		};

		for (const group of functionEndpoints) {
			map[group].apply(testServer);
		}
	}

	return testServer.app;
}

export function initTestTelemetry() {
	const mockNodeTypes = { nodeTypes: {} } as INodeTypes;

	void InternalHooksManager.init('test-instance-id', 'test-version', mockNodeTypes);

	jest.spyOn(Telemetry.prototype, 'track').mockResolvedValue();
}

/**
 * Classify endpoint groups into `routerEndpoints` (newest, using `express.Router`),
 * and `functionEndpoints` (legacy, namespaced inside a function).
 */
const classifyEndpointGroups = (endpointGroups: string[]) => {
	const routerEndpoints: string[] = [];
	const functionEndpoints: string[] = [];

	endpointGroups.forEach((group) =>
		(group === 'credentials' ? routerEndpoints : functionEndpoints).push(group),
	);

	return [routerEndpoints, functionEndpoints];
};

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize a silent logger for test runs.
 */
export function initTestLogger() {
	config.set('logs.output', 'file'); // declutter console output
	LoggerProxy.init(getLogger());
}

/**
 * Initialize a user settings config file if non-existent.
 */
export function initConfigFile() {
	const settingsPath = UserSettings.getUserSettingsPath();

	if (!existsSync(settingsPath)) {
		const userSettings = { encryptionKey: randomBytes(24).toString('base64') };
		UserSettings.writeUserSettings(userSettings, settingsPath);
	}
}

// ----------------------------------
//           request agent
// ----------------------------------

/**
 * Create a request agent, optionally with an auth cookie.
 */
export function createAgent(app: express.Application, options?: { auth: true; user: User }) {
	const agent = request.agent(app);
	agent.use(prefix(REST_PATH_SEGMENT));

	if (options?.auth && options?.user) {
		const { token } = issueJWT(options.user);
		agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
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
export function getAuthToken(response: request.Response, authCookieName = AUTH_COOKIE_NAME) {
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

export async function isInstanceOwnerSetUp() {
	const { value } = await Db.collections.Settings!.findOneOrFail({
		key: 'userManagement.isInstanceOwnerSetUp',
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

