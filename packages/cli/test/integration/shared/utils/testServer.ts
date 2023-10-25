import { Container } from 'typedi';
import cookieParser from 'cookie-parser';
import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import config from '@/config';
import { ExternalHooks } from '@/ExternalHooks';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { workflowsController } from '@/workflows/workflows.controller';
import { AUTH_COOKIE_NAME } from '@/constants';
import { credentialsController } from '@/credentials/credentials.controller';
import type { User } from '@db/entities/User';
import { getLogger } from '@/Logger';
import { loadPublicApiVersions } from '@/PublicApi/';
import { issueJWT } from '@/auth/jwt';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';
import { licenseController } from '@/license/license.controller';
import { registerController } from '@/decorators';
import {
	AuthController,
	LdapController,
	MFAController,
	MeController,
	OwnerController,
	PasswordResetController,
	TagsController,
	UsersController,
} from '@/controllers';
import { rawBodyReader, bodyParser, setupAuthMiddlewares } from '@/middlewares';

import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';
import { variablesController } from '@/environments/variables/variables.controller';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import { handleLdapInit } from '@/Ldap/helpers';
import { setSamlLoginEnabled } from '@/sso/saml/samlHelpers';
import { SamlController } from '@/sso/saml/routes/saml.controller.ee';
import { EventBusController } from '@/eventbus/eventBus.controller';
import { EventBusControllerEE } from '@/eventbus/eventBus.controller.ee';
import { License } from '@/License';
import { SourceControlController } from '@/environments/sourceControl/sourceControl.controller.ee';

import * as testDb from '../../shared/testDb';
import { AUTHLESS_ENDPOINTS, PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import type { EndpointGroup, SetupProps, TestServer } from '../types';
import { mockInstance } from './mocking';
import { ExternalSecretsController } from '@/ExternalSecrets/ExternalSecrets.controller.ee';
import { MfaService } from '@/Mfa/mfa.service';
import { MetricsService } from '@/services/metrics.service';
import {
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@/databases/repositories';
import { JwtService } from '@/services/jwt.service';
import { RoleService } from '@/services/role.service';
import { UserService } from '@/services/user.service';
import { executionsController } from '@/executions/executions.controller';
import { WorkflowHistoryController } from '@/workflows/workflowHistory/workflowHistory.controller.ee';
import { BinaryDataController } from '@/controllers/binaryData.controller';

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

/**
 * Classify endpoint groups into `routerEndpoints` (newest, using `express.Router`),
 * and `functionEndpoints` (legacy, namespaced inside a function).
 */
const classifyEndpointGroups = (endpointGroups: EndpointGroup[]) => {
	const routerEndpoints: EndpointGroup[] = [];
	const functionEndpoints: EndpointGroup[] = [];

	const ROUTER_GROUP = [
		'credentials',
		'workflows',
		'publicApi',
		'license',
		'variables',
		'executions',
	];

	endpointGroups.forEach((group) =>
		(ROUTER_GROUP.includes(group) ? routerEndpoints : functionEndpoints).push(group),
	);

	return [routerEndpoints, functionEndpoints];
};

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
}: SetupProps): TestServer => {
	const app = express();
	app.use(rawBodyReader);
	app.use(cookieParser());

	const logger = getLogger();
	LoggerProxy.init(logger);

	const testServer: TestServer = {
		app,
		httpServer: app.listen(0),
		authAgentFor: (user: User) => createAgent(app, { auth: true, user }),
		authlessAgent: createAgent(app),
		publicApiAgentFor: (user) => publicApiAgent(app, { user }),
	};

	beforeAll(async () => {
		await testDb.init();

		// Mock all telemetry.
		mockInstance(InternalHooks);
		mockInstance(PostHogClient);

		config.set('userManagement.jwtSecret', 'My JWT secret');
		config.set('userManagement.isInstanceOwnerSetUp', true);

		if (enabledFeatures) {
			Container.get(License).isFeatureEnabled = (feature) => enabledFeatures.includes(feature);
		}

		const enablePublicAPI = endpointGroups?.includes('publicApi');
		if (applyAuth && !enablePublicAPI) {
			setupAuthMiddlewares(app, AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT);
		}

		if (!endpointGroups) return;

		app.use(bodyParser);

		const [routerEndpoints, functionEndpoints] = classifyEndpointGroups(endpointGroups);

		if (routerEndpoints.length) {
			const map: Record<string, express.Router | express.Router[] | any> = {
				credentials: { controller: credentialsController, path: 'credentials' },
				workflows: { controller: workflowsController, path: 'workflows' },
				license: { controller: licenseController, path: 'license' },
				variables: { controller: variablesController, path: 'variables' },
				executions: { controller: executionsController, path: 'executions' },
			};

			if (enablePublicAPI) {
				const { apiRouters } = await loadPublicApiVersions(PUBLIC_API_REST_PATH_SEGMENT);
				map.publicApi = apiRouters;
			}

			for (const group of routerEndpoints) {
				if (group === 'publicApi') {
					app.use(...(map[group] as express.Router[]));
				} else {
					app.use(`/${REST_PATH_SEGMENT}/${map[group].path}`, map[group].controller);
				}
			}
		}

		if (functionEndpoints.length) {
			const externalHooks = Container.get(ExternalHooks);
			const internalHooks = Container.get(InternalHooks);
			const mailer = Container.get(UserManagementMailer);
			const mfaService = Container.get(MfaService);
			const userService = Container.get(UserService);

			for (const group of functionEndpoints) {
				switch (group) {
					case 'metrics':
						await Container.get(MetricsService).configureMetrics(app);
						break;
					case 'eventBus':
						registerController(app, config, new EventBusController());
						registerController(app, config, new EventBusControllerEE());
						break;
					case 'auth':
						registerController(
							app,
							config,
							new AuthController(config, logger, internalHooks, mfaService, userService),
						);
						break;
					case 'mfa':
						registerController(app, config, new MFAController(mfaService));
					case 'ldap':
						Container.get(License).isLdapEnabled = () => true;
						await handleLdapInit();
						const { service, sync } = LdapManager.getInstance();
						registerController(app, config, new LdapController(service, sync, internalHooks));
						break;
					case 'saml':
						await setSamlLoginEnabled(true);
						registerController(app, config, Container.get(SamlController));
						break;
					case 'sourceControl':
						registerController(app, config, Container.get(SourceControlController));
						break;
					case 'community-packages':
						const { CommunityPackagesController } = await import(
							'@/controllers/communityPackages.controller'
						);
						registerController(app, config, Container.get(CommunityPackagesController));
					case 'me':
						registerController(
							app,
							config,
							new MeController(logger, externalHooks, internalHooks, userService),
						);
						break;
					case 'passwordReset':
						registerController(
							app,
							config,
							new PasswordResetController(
								logger,
								externalHooks,
								internalHooks,
								mailer,
								userService,
								Container.get(JwtService),
								mfaService,
							),
						);
						break;
					case 'owner':
						registerController(
							app,
							config,
							new OwnerController(
								config,
								logger,
								internalHooks,
								Container.get(SettingsRepository),
								userService,
							),
						);
						break;
					case 'users':
						registerController(
							app,
							config,
							new UsersController(
								config,
								logger,
								externalHooks,
								internalHooks,
								Container.get(SharedCredentialsRepository),
								Container.get(SharedWorkflowRepository),
								Container.get(ActiveWorkflowRunner),
								mailer,
								Container.get(JwtService),
								Container.get(RoleService),
								userService,
							),
						);
						break;
					case 'tags':
						registerController(app, config, Container.get(TagsController));
						break;
					case 'externalSecrets':
						registerController(app, config, Container.get(ExternalSecretsController));
						break;
					case 'workflowHistory':
						registerController(app, config, Container.get(WorkflowHistoryController));
						break;
					case 'binaryData':
						registerController(app, config, Container.get(BinaryDataController));
						break;
				}
			}
		}
	});

	afterAll(async () => {
		await testDb.terminate();
		testServer.httpServer.close();
	});

	return testServer;
};
