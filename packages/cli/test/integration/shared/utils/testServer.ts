import { Container } from 'typedi';
import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { User } from '@db/entities/User';
import { ControllerRegistry } from '@/decorators';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import { License } from '@/License';
import { Logger } from '@/Logger';
import { InternalHooks } from '@/InternalHooks';
import { AuthService } from '@/auth/auth.service';
import type { APIRequest } from '@/requests';

import { mockInstance } from '../../../shared/mocking';
import * as testDb from '../../shared/testDb';
import { PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import type { SetupProps, TestServer } from '../types';
import { LicenseMocker } from '../license';

/**
 * Plugin to prefix a path segment into a request URL pathname.
 *
 * Example: http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
function prefix(pathSegment: string) {
	return async function (request: superagent.SuperAgentRequest) {
		const url = new URL(request.url);

		// enforce consistency at call sites
		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}

		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();
		return await request;
	};
}

const browserId = 'test-browser-id';
function createAgent(app: express.Application, options?: { auth: boolean; user: User }) {
	const agent = request.agent(app);
	void agent.use(prefix(REST_PATH_SEGMENT));
	if (options?.auth && options?.user) {
		const token = Container.get(AuthService).issueJWT(options.user, browserId);
		agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
	}
	return agent;
}

function publicApiAgent(
	app: express.Application,
	{ user, version = 1 }: { user: User; version?: number },
) {
	const agent = request.agent(app);
	void agent.use(prefix(`${PUBLIC_API_REST_PATH_SEGMENT}/v${version}`));
	if (user.apiKey) {
		void agent.set({ 'X-N8N-API-KEY': user.apiKey });
	}
	return agent;
}

export const setupTestServer = ({
	endpointGroups,
	enabledFeatures,
	quotas,
}: SetupProps): TestServer => {
	const app = express();
	app.use(rawBodyReader);
	app.use(cookieParser());
	app.use((req: APIRequest, _, next) => {
		req.browserId = browserId;
		next();
	});

	// Mock all telemetry and logging
	mockInstance(Logger);
	mockInstance(InternalHooks);
	mockInstance(PostHogClient);
	mockInstance(Push);

	const testServer: TestServer = {
		app,
		httpServer: app.listen(0),
		authAgentFor: (user: User) => createAgent(app, { auth: true, user }),
		authlessAgent: createAgent(app),
		publicApiAgentFor: (user) => publicApiAgent(app, { user }),
		license: new LicenseMocker(),
	};

	// eslint-disable-next-line complexity
	beforeAll(async () => {
		await testDb.init();

		config.set('userManagement.jwtSecret', 'My JWT secret');
		config.set('userManagement.isInstanceOwnerSetUp', true);

		testServer.license.mock(Container.get(License));
		if (enabledFeatures) {
			testServer.license.setDefaults({
				features: enabledFeatures,
				quotas,
			});
		}

		if (!endpointGroups) return;

		app.use(bodyParser);

		const enablePublicAPI = endpointGroups?.includes('publicApi');
		if (enablePublicAPI) {
			const { loadPublicApiVersions } = await import('@/PublicApi');
			const { apiRouters } = await loadPublicApiVersions(PUBLIC_API_REST_PATH_SEGMENT);
			app.use(...apiRouters);
		}

		if (endpointGroups.length) {
			for (const group of endpointGroups) {
				switch (group) {
					case 'credentials':
						await import('@/credentials/credentials.controller');
						break;

					case 'workflows':
						await import('@/workflows/workflows.controller');
						break;

					case 'executions':
						await import('@/executions/executions.controller');
						break;

					case 'variables':
						await import('@/environments/variables/variables.controller.ee');
						break;

					case 'license':
						await import('@/license/license.controller');
						break;

					case 'metrics':
						const { MetricsService } = await import('@/services/metrics.service');
						await Container.get(MetricsService).configureMetrics(app);
						break;

					case 'eventBus':
						await import('@/eventbus/eventBus.controller');
						break;

					case 'auth':
						await import('@/controllers/auth.controller');
						break;

					case 'mfa':
						await import('@/controllers/mfa.controller');
						break;

					case 'ldap':
						const { LdapService } = await import('@/Ldap/ldap.service');
						await import('@/Ldap/ldap.controller');
						testServer.license.enable('feat:ldap');
						await Container.get(LdapService).init();
						break;

					case 'saml':
						const { setSamlLoginEnabled } = await import('@/sso/saml/samlHelpers');
						await import('@/sso/saml/routes/saml.controller.ee');
						await setSamlLoginEnabled(true);
						break;

					case 'sourceControl':
						await import('@/environments/sourceControl/sourceControl.controller.ee');
						break;

					case 'community-packages':
						await import('@/controllers/communityPackages.controller');
						break;

					case 'me':
						await import('@/controllers/me.controller');
						break;

					case 'passwordReset':
						await import('@/controllers/passwordReset.controller');
						break;

					case 'owner':
						await import('@/controllers/owner.controller');
						break;

					case 'users':
						await import('@/controllers/users.controller');
						break;

					case 'invitations':
						await import('@/controllers/invitation.controller');
						break;

					case 'tags':
						await import('@/controllers/tags.controller');
						break;

					case 'externalSecrets':
						await import('@/ExternalSecrets/ExternalSecrets.controller.ee');
						break;

					case 'workflowHistory':
						await import('@/workflows/workflowHistory/workflowHistory.controller.ee');
						break;

					case 'binaryData':
						await import('@/controllers/binaryData.controller');
						break;

					case 'debug':
						await import('@/controllers/debug.controller');
						break;

					case 'project':
						await import('@/controllers/project.controller');
						break;

					case 'role':
						await import('@/controllers/role.controller');
						break;

					case 'dynamic-node-parameters':
						await import('@/controllers/dynamicNodeParameters.controller');
						break;
				}
			}

			Container.get(ControllerRegistry).activate(app);
		}
	});

	afterAll(async () => {
		await testDb.terminate();
		testServer.httpServer.close();
	});

	beforeEach(() => {
		testServer.license.reset();
	});

	return testServer;
};
