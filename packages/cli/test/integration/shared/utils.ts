import { randomBytes } from 'crypto';
import { existsSync } from 'fs';

import bodyParser from 'body-parser';
import express from 'express';
import { UserSettings } from 'n8n-core';
import { INodeTypes, LoggerProxy } from 'n8n-workflow';
import superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';
import type { N8nApp } from '../../../src/UserManagement/Interfaces';

import config from '../../../config';
import { Db, ExternalHooks, InternalHooksManager } from '../../../src';
import { nodesController } from '../../../src/api/nodes.api';
import { workflowsController } from '../../../src/api/workflows.api';
import { AUTH_COOKIE_NAME, NODE_PACKAGE_PREFIX } from '../../../src/constants';
import { credentialsController } from '../../../src/credentials/credentials.controller';
import { InstalledPackages } from '../../../src/databases/entities/InstalledPackages';
import type { User } from '../../../src/databases/entities/User';
import { getLogger } from '../../../src/Logger';
import { issueJWT } from '../../../src/UserManagement/auth/jwt';
import { addRoutes as authMiddleware } from '../../../src/UserManagement/routes';
import { authenticationMethods as authEndpoints } from '../../../src/UserManagement/routes/auth';
import { meNamespace as meEndpoints } from '../../../src/UserManagement/routes/me';
import { ownerNamespace as ownerEndpoints } from '../../../src/UserManagement/routes/owner';
import { passwordResetNamespace as passwordResetEndpoints } from '../../../src/UserManagement/routes/passwordReset';
import { usersNamespace as usersEndpoints } from '../../../src/UserManagement/routes/users';
import {
	AUTHLESS_ENDPOINTS,
	COMMUNITY_NODE_VERSION,
	COMMUNITY_PACKAGE_VERSION,
	REST_PATH_SEGMENT,
} from './constants';
import { randomName } from './random';
import type {
	EndpointGroup,
	InstalledNodePayload,
	InstalledPackagePayload,
	PostgresSchemaSection,
} from './types';

export class TestUtils {
	/**
	 * Initialize a test server.
	 *
	 * @param applyAuth Whether to apply auth middleware to test server.
	 * @param endpointGroups Groups of endpoints to apply to test server.
	 */
	async initTestServer({
		applyAuth,
		endpointGroups,
	}: {
		applyAuth: boolean;
		endpointGroups?: EndpointGroup[];
	}) {
		const testServer = {
			app: express(),
			restEndpoint: REST_PATH_SEGMENT,
			externalHooks: {},
		};

		testServer.app.use(bodyParser.json());
		testServer.app.use(bodyParser.urlencoded({ extended: true }));

		config.set('userManagement.jwtSecret', 'My JWT secret');
		config.set('userManagement.isInstanceOwnerSetUp', false);

		if (applyAuth) {
			authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);
		}

		if (!endpointGroups) return testServer.app;

		if (
			endpointGroups.includes('credentials') ||
			endpointGroups.includes('me') ||
			endpointGroups.includes('users') ||
			endpointGroups.includes('passwordReset')
		) {
			testServer.externalHooks = ExternalHooks();
		}

		const [routerEndpoints, functionEndpoints] = this.classifyEndpointGroups(endpointGroups);

		if (routerEndpoints.length) {
			const map: Record<string, express.Router | express.Router[] | any> = {
				credentials: { controller: credentialsController, path: 'credentials' },
				workflows: { controller: workflowsController, path: 'workflows' },
				nodes: { controller: nodesController, path: 'nodes' },
			};

			for (const group of routerEndpoints) {
				testServer.app.use(`/${testServer.restEndpoint}/${map[group].path}`, map[group].controller);
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

	/**
	 * Pre-requisite: Mock the telemetry module before calling.
	 */
	initTestTelemetry() {
		const mockNodeTypes = { nodeTypes: {} } as INodeTypes;

		void InternalHooksManager.init('test-instance-id', 'test-version', mockNodeTypes);
	}

	/**
	 * Classify endpoint groups into `routerEndpoints` (newest, using `express.Router`),
	 * and `functionEndpoints` (legacy, namespaced inside a function).
	 */
	classifyEndpointGroups(endpointGroups: string[]) {
		const routerEndpoints: string[] = [];
		const functionEndpoints: string[] = [];

		const ROUTER_GROUP = ['credentials', 'nodes', 'workflows'];

		endpointGroups.forEach((group) =>
			(ROUTER_GROUP.includes(group) ? routerEndpoints : functionEndpoints).push(group),
		);

		return [routerEndpoints, functionEndpoints];
	}

	// ----------------------------------
	//          initializers
	// ----------------------------------

	/**
	 * Initialize a logger for test runs.
	 */
	initTestLogger() {
		LoggerProxy.init(getLogger());
	}

	/**
	 * Initialize a user settings config file if non-existent.
	 */
	initConfigFile() {
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
	createAgent(app: express.Application, options?: { auth: boolean; user: User }) {
		const agent = request.agent(app);

		agent.use(this.prefix(REST_PATH_SEGMENT));
		if (options?.auth && options?.user) {
			const { token } = issueJWT(options.user);
			agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
		}

		return agent;
	}

	createAuthAgent(app: express.Application) {
		return (user: User) => this.createAgent(app, { auth: true, user });
	}

	/**
	 * Plugin to prefix a path segment into a request URL pathname.
	 *
	 * Example: http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
	 */
	prefix(pathSegment: string) {
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
	getAuthToken(response: request.Response, authCookieName = AUTH_COOKIE_NAME) {
		const cookies: string[] = response.headers['set-cookie'];

		if (!cookies) return undefined;

		const authCookie = cookies.find((c) => c.startsWith(`${authCookieName}=`));

		if (!authCookie) return undefined;

		const match = authCookie.match(new RegExp(`(^| )${authCookieName}=(?<token>[^;]+)`));

		if (!match || !match.groups) return undefined;

		return match.groups.token;
	}

	// ----------------------------------
	//            settings
	// ----------------------------------

	async isInstanceOwnerSetUp() {
		const { value } = await Db.collections.Settings.findOneOrFail({
			key: 'userManagement.isInstanceOwnerSetUp',
		});

		return Boolean(value);
	}

	// ----------------------------------
	//              misc
	// ----------------------------------

	/**
	 * Categorize array items into two groups based on whether they pass a test.
	 */
	categorize = <T>(arr: T[], test: (str: T) => boolean) => {
		return arr.reduce<{ pass: T[]; fail: T[] }>(
			(acc, cur) => {
				test(cur) ? acc.pass.push(cur) : acc.fail.push(cur);

				return acc;
			},
			{ pass: [], fail: [] },
		);
	};

	getPostgresSchemaSection(schema = config.getSchema()): PostgresSchemaSection | null {
		for (const [key, value] of Object.entries(schema)) {
			if (key === 'postgresdb') {
				return value._cvtProperties;
			}
		}

		return null;
	}

	// ----------------------------------
	//         community nodes
	// ----------------------------------

	installedPackagePayload(): InstalledPackagePayload {
		return {
			packageName: NODE_PACKAGE_PREFIX + randomName(),
			installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
		};
	}

	installedNodePayload(packageName: string): InstalledNodePayload {
		const nodeName = randomName();
		return {
			name: nodeName,
			type: nodeName,
			latestVersion: COMMUNITY_NODE_VERSION.CURRENT,
			package: packageName,
		};
	}

	emptyPackage() {
		const installedPackage = new InstalledPackages();
		installedPackage.installedNodes = [];

		return Promise.resolve(installedPackage);
	}
}

export const utils = new TestUtils();
