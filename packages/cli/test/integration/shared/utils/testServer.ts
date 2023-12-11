import { Container } from 'typedi';
import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { User } from '@db/entities/User';
import { issueJWT } from '@/auth/jwt';
import { registerController } from '@/decorators';
import { rawBodyReader, bodyParser, setupAuthMiddlewares } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { License } from '@/License';
import { Logger } from '@/Logger';

import { mockInstance } from '../../../shared/mocking';
import * as testDb from '../../shared/testDb';
import { AUTHLESS_ENDPOINTS, PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import type { SetupProps, TestServer } from '../types';
import { InternalHooks } from '@/InternalHooks';
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
		return request;
	};
}

function createAgent(app: express.Application, options?: { auth: boolean; user: User }) {
	const agent = request.agent(app);
	void agent.use(prefix(REST_PATH_SEGMENT));
	if (options?.auth && options?.user) {
		const { token } = issueJWT(options.user);
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
	applyAuth = true,
	enabledFeatures,
	quotas,
}: SetupProps): TestServer => {
	const app = express();
	app.use(rawBodyReader);
	app.use(cookieParser());

	// Mock all telemetry and logging
	const logger = mockInstance(Logger);
	mockInstance(InternalHooks);
	mockInstance(PostHogClient);

	const testServer: TestServer = {
		app,
		httpServer: app.listen(0),
		authAgentFor: (user: User) => createAgent(app, { auth: true, user }),
		authlessAgent: createAgent(app),
		publicApiAgentFor: (user) => publicApiAgent(app, { user }),
		license: new LicenseMocker(),
	};

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

		const enablePublicAPI = endpointGroups?.includes('publicApi');
		if (applyAuth && !enablePublicAPI) {
			setupAuthMiddlewares(app, AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT);
		}

		if (!endpointGroups) return;

		app.use(bodyParser);

		if (enablePublicAPI) {
			const { loadPublicApiVersions } = await import('@/PublicApi');
			const { apiRouters } = await loadPublicApiVersions(PUBLIC_API_REST_PATH_SEGMENT);
			app.use(...apiRouters);
		}

		if (endpointGroups.length) {
			for (const group of endpointGroups) {
				switch (group) {
					case 'credentials':
						const { credentialsController } = await import('@/credentials/credentials.controller');
						app.use(`/${REST_PATH_SEGMENT}/credentials`, credentialsController);
						break;

					case 'workflows':
						const { workflowsController } = await import('@/workflows/workflows.controller');
						app.use(`/${REST_PATH_SEGMENT}/workflows`, workflowsController);
						break;

					case 'executions':
						const { executionsController } = await import('@/executions/executions.controller');
						app.use(`/${REST_PATH_SEGMENT}/executions`, executionsController);
						break;

					case 'variables':
						const { VariablesController } = await import(
							'@/environments/variables/variables.controller.ee'
						);
						registerController(app, config, Container.get(VariablesController));
						break;

					case 'license':
						const { licenseController } = await import('@/license/license.controller');
						app.use(`/${REST_PATH_SEGMENT}/license`, licenseController);
						break;

					case 'metrics':
						const { MetricsService } = await import('@/services/metrics.service');
						await Container.get(MetricsService).configureMetrics(app);
						break;

					case 'eventBus':
						const { EventBusController } = await import('@/eventbus/eventBus.controller');
						const { EventBusControllerEE } = await import('@/eventbus/eventBus.controller.ee');
						registerController(app, config, new EventBusController());
						registerController(app, config, new EventBusControllerEE());
						break;

					case 'auth':
						const { AuthController } = await import('@/controllers/auth.controller');
						registerController(app, config, Container.get(AuthController));
						break;

					case 'mfa':
						const { MFAController } = await import('@/controllers/mfa.controller');
						registerController(app, config, Container.get(MFAController));
						break;

					case 'ldap':
						const { LdapManager } = await import('@/Ldap/LdapManager.ee');
						const { handleLdapInit } = await import('@/Ldap/helpers');
						const { LdapController } = await import('@/controllers/ldap.controller');
						testServer.license.enable('feat:ldap');
						await handleLdapInit();
						const { service, sync } = LdapManager.getInstance();
						registerController(
							app,
							config,
							new LdapController(service, sync, Container.get(InternalHooks)),
						);
						break;

					case 'saml':
						const { setSamlLoginEnabled } = await import('@/sso/saml/samlHelpers');
						const { SamlController } = await import('@/sso/saml/routes/saml.controller.ee');
						await setSamlLoginEnabled(true);
						registerController(app, config, Container.get(SamlController));
						break;

					case 'sourceControl':
						const { SourceControlController } = await import(
							'@/environments/sourceControl/sourceControl.controller.ee'
						);
						registerController(app, config, Container.get(SourceControlController));
						break;

					case 'community-packages':
						const { CommunityPackagesController } = await import(
							'@/controllers/communityPackages.controller'
						);
						registerController(app, config, Container.get(CommunityPackagesController));
						break;

					case 'me':
						const { MeController } = await import('@/controllers/me.controller');
						registerController(app, config, Container.get(MeController));
						break;

					case 'passwordReset':
						const { PasswordResetController } = await import(
							'@/controllers/passwordReset.controller'
						);
						registerController(app, config, Container.get(PasswordResetController));
						break;

					case 'owner':
						const { UserService } = await import('@/services/user.service');
						const { SettingsRepository } = await import('@db/repositories/settings.repository');
						const { OwnerController } = await import('@/controllers/owner.controller');
						registerController(
							app,
							config,
							new OwnerController(
								config,
								logger,
								Container.get(InternalHooks),
								Container.get(SettingsRepository),
								Container.get(UserService),
							),
						);
						break;

					case 'users':
						const { SharedCredentialsRepository } = await import(
							'@db/repositories/sharedCredentials.repository'
						);
						const { SharedWorkflowRepository } = await import(
							'@db/repositories/sharedWorkflow.repository'
						);
						const { ActiveWorkflowRunner } = await import('@/ActiveWorkflowRunner');
						const { UserService: US } = await import('@/services/user.service');
						const { ExternalHooks: EH } = await import('@/ExternalHooks');
						const { RoleService: RS } = await import('@/services/role.service');
						const { UsersController } = await import('@/controllers/users.controller');
						registerController(
							app,
							config,
							new UsersController(
								logger,
								Container.get(EH),
								Container.get(InternalHooks),
								Container.get(SharedCredentialsRepository),
								Container.get(SharedWorkflowRepository),
								Container.get(ActiveWorkflowRunner),
								Container.get(RS),
								Container.get(US),
								Container.get(License),
							),
						);
						break;

					case 'invitations':
						const { InvitationController } = await import('@/controllers/invitation.controller');
						const { ExternalHooks: EHS } = await import('@/ExternalHooks');
						const { UserService: USE } = await import('@/services/user.service');

						registerController(
							app,
							config,
							new InvitationController(
								config,
								logger,
								Container.get(InternalHooks),
								Container.get(EHS),
								Container.get(USE),
								Container.get(License),
							),
						);
						break;

					case 'tags':
						const { TagsController } = await import('@/controllers/tags.controller');
						registerController(app, config, Container.get(TagsController));
						break;

					case 'externalSecrets':
						const { ExternalSecretsController } = await import(
							'@/ExternalSecrets/ExternalSecrets.controller.ee'
						);
						registerController(app, config, Container.get(ExternalSecretsController));
						break;

					case 'workflowHistory':
						const { WorkflowHistoryController } = await import(
							'@/workflows/workflowHistory/workflowHistory.controller.ee'
						);
						registerController(app, config, Container.get(WorkflowHistoryController));
						break;

					case 'binaryData':
						const { BinaryDataController } = await import('@/controllers/binaryData.controller');
						registerController(app, config, Container.get(BinaryDataController));
						break;

					case 'role':
						const { RoleController } = await import('@/controllers/role.controller');
						registerController(app, config, Container.get(RoleController));
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
