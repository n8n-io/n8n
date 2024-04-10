import { Container } from 'typedi';
import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { User } from '@db/entities/User';
import { registerController } from '@/decorators';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import { License } from '@/License';
import { Logger } from '@/Logger';
import { InternalHooks } from '@/InternalHooks';

import { mockInstance } from '../../../shared/mocking';
import * as testDb from '../../shared/testDb';
import { PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import type { SetupProps, TestServer } from '../types';
import { LicenseMocker } from '../license';
import { AuthService } from '@/auth/auth.service';
import type { APIRequest } from '@/requests';

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
						const { CredentialsController } = await import('@/credentials/credentials.controller');
						registerController(app, CredentialsController);
						break;

					case 'workflows':
						const { WorkflowsController } = await import('@/workflows/workflows.controller');
						registerController(app, WorkflowsController);
						break;

					case 'executions':
						const { ExecutionsController } = await import('@/executions/executions.controller');
						registerController(app, ExecutionsController);
						break;

					case 'variables':
						const { VariablesController } = await import(
							'@/environments/variables/variables.controller.ee'
						);
						registerController(app, VariablesController);
						break;

					case 'license':
						const { LicenseController } = await import('@/license/license.controller');
						registerController(app, LicenseController);
						break;

					case 'metrics':
						const { MetricsService } = await import('@/services/metrics.service');
						await Container.get(MetricsService).configureMetrics(app);
						break;

					case 'eventBus':
						const { EventBusController } = await import('@/eventbus/eventBus.controller');
						const { EventBusControllerEE } = await import('@/eventbus/eventBus.controller.ee');
						registerController(app, EventBusController);
						registerController(app, EventBusControllerEE);
						break;

					case 'auth':
						const { AuthController } = await import('@/controllers/auth.controller');
						registerController(app, AuthController);
						break;

					case 'mfa':
						const { MFAController } = await import('@/controllers/mfa.controller');
						registerController(app, MFAController);
						break;

					case 'ldap':
						const { LdapService } = await import('@/Ldap/ldap.service');
						const { LdapController } = await import('@/Ldap/ldap.controller');
						testServer.license.enable('feat:ldap');
						await Container.get(LdapService).init();
						registerController(app, LdapController);
						break;

					case 'saml':
						const { setSamlLoginEnabled } = await import('@/sso/saml/samlHelpers');
						const { SamlController } = await import('@/sso/saml/routes/saml.controller.ee');
						await setSamlLoginEnabled(true);
						registerController(app, SamlController);
						break;

					case 'sourceControl':
						const { SourceControlController } = await import(
							'@/environments/sourceControl/sourceControl.controller.ee'
						);
						registerController(app, SourceControlController);
						break;

					case 'community-packages':
						const { CommunityPackagesController } = await import(
							'@/controllers/communityPackages.controller'
						);
						registerController(app, CommunityPackagesController);
						break;

					case 'me':
						const { MeController } = await import('@/controllers/me.controller');
						registerController(app, MeController);
						break;

					case 'passwordReset':
						const { PasswordResetController } = await import(
							'@/controllers/passwordReset.controller'
						);
						registerController(app, PasswordResetController);
						break;

					case 'owner':
						const { OwnerController } = await import('@/controllers/owner.controller');
						registerController(app, OwnerController);
						break;

					case 'users':
						const { UsersController } = await import('@/controllers/users.controller');
						registerController(app, UsersController);
						break;

					case 'invitations':
						const { InvitationController } = await import('@/controllers/invitation.controller');
						registerController(app, InvitationController);
						break;

					case 'tags':
						const { TagsController } = await import('@/controllers/tags.controller');
						registerController(app, TagsController);
						break;

					case 'externalSecrets':
						const { ExternalSecretsController } = await import(
							'@/ExternalSecrets/ExternalSecrets.controller.ee'
						);
						registerController(app, ExternalSecretsController);
						break;

					case 'workflowHistory':
						const { WorkflowHistoryController } = await import(
							'@/workflows/workflowHistory/workflowHistory.controller.ee'
						);
						registerController(app, WorkflowHistoryController);
						break;

					case 'binaryData':
						const { BinaryDataController } = await import('@/controllers/binaryData.controller');
						registerController(app, BinaryDataController);
						break;

					case 'debug':
						const { DebugController } = await import('@/controllers/debug.controller');
						registerController(app, DebugController);
						break;

					case 'project':
						const { ProjectController } = await import('@/controllers/project.controller');
						registerController(app, ProjectController);
						break;

					case 'role':
						const { RoleController } = await import('@/controllers/role.controller');
						registerController(app, RoleController);
						break;
				}
			}
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
