import { Container } from 'typedi';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import config from '@/config';
import * as Db from '@/Db';
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
	MeController,
	NodesController,
	OwnerController,
	PasswordResetController,
	UsersController,
} from '@/controllers';
import { setupAuthMiddlewares } from '@/middlewares';

import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { PostHogClient } from '@/posthog';
import { variablesController } from '@/environments/variables/variables.controller';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import { handleLdapInit } from '@/Ldap/helpers';
import { Push } from '@/push';
import { setSamlLoginEnabled } from '@/sso/saml/samlHelpers';
import { SamlController } from '@/sso/saml/routes/saml.controller.ee';
import { EventBusController } from '@/eventbus/eventBus.controller';
import { License } from '@/License';
import { SourceControlController } from '@/environments/sourceControl/sourceControl.controller.ee';

import * as testDb from '../../shared/testDb';
import { AUTHLESS_ENDPOINTS, PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import type { EndpointGroup, SetupProps, TestServer } from '../types';
import { mockInstance } from './mocking';

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

	const ROUTER_GROUP = ['credentials', 'workflows', 'publicApi', 'license', 'variables'];

	endpointGroups.forEach((group) =>
		(ROUTER_GROUP.includes(group) ? routerEndpoints : functionEndpoints).push(group),
	);

	return [routerEndpoints, functionEndpoints];
};

function createAgent(app: express.Application, options?: { auth: boolean; user: User }) {
	const agent = request.agent(app);
	void agent.use(prefix(REST_PATH_SEGMENT));
	if (options?.auth && options?.user) {
		try {
			const { token } = issueJWT(options.user);
			agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
		} catch {}
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
	const testServer: TestServer = {
		app,
		httpServer: app.listen(0),
		authAgentFor: (user: User) => createAgent(app, { auth: true, user }),
		authlessAgent: createAgent(app),
		publicApiAgentFor: (user) => publicApiAgent(app, { user }),
	};

	beforeAll(async () => {
		await testDb.init();

		const logger = getLogger();
		LoggerProxy.init(logger);

		// Mock all telemetry.
		mockInstance(InternalHooks);
		mockInstance(PostHogClient);

		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(cookieParser());

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

		const [routerEndpoints, functionEndpoints] = classifyEndpointGroups(endpointGroups);

		if (routerEndpoints.length) {
			const map: Record<string, express.Router | express.Router[] | any> = {
				credentials: { controller: credentialsController, path: 'credentials' },
				workflows: { controller: workflowsController, path: 'workflows' },
				license: { controller: licenseController, path: 'license' },
				variables: { controller: variablesController, path: 'variables' },
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
			const repositories = Db.collections;

			for (const group of functionEndpoints) {
				switch (group) {
					case 'eventBus':
						registerController(app, config, new EventBusController());
						break;
					case 'auth':
						registerController(
							app,
							config,
							new AuthController({ config, logger, internalHooks, repositories }),
						);
						break;
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
					case 'nodes':
						registerController(
							app,
							config,
							new NodesController(
								config,
								Container.get(LoadNodesAndCredentials),
								Container.get(Push),
								internalHooks,
							),
						);
					case 'me':
						registerController(
							app,
							config,
							new MeController({ logger, externalHooks, internalHooks, repositories }),
						);
						break;
					case 'passwordReset':
						registerController(
							app,
							config,
							new PasswordResetController({
								config,
								logger,
								externalHooks,
								internalHooks,
								mailer,
								repositories,
							}),
						);
						break;
					case 'owner':
						registerController(
							app,
							config,
							new OwnerController({ config, logger, internalHooks, repositories }),
						);
						break;
					case 'users':
						registerController(
							app,
							config,
							new UsersController({
								config,
								mailer,
								externalHooks,
								internalHooks,
								repositories,
								activeWorkflowRunner: Container.get(ActiveWorkflowRunner),
								logger,
							}),
						);
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
