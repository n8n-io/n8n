import { Container } from 'typedi';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';

import bodyParser from 'body-parser';
import { CronJob } from 'cron';
import express from 'express';
import set from 'lodash.set';
import { BinaryDataManager, UserSettings } from 'n8n-core';
import {
	ICredentialType,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	ITriggerFunctions,
	ITriggerResponse,
	LoggerProxy,
	NodeHelpers,
	toCronExpression,
	TriggerTime,
} from 'n8n-workflow';
import superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';
import { mock } from 'jest-mock-extended';
import { DeepPartial } from 'ts-essentials';
import config from '@/config';
import * as Db from '@/Db';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ExternalHooks } from '@/ExternalHooks';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { workflowsController } from '@/workflows/workflows.controller';
import { AUTH_COOKIE_NAME, NODE_PACKAGE_PREFIX } from '@/constants';
import { credentialsController } from '@/credentials/credentials.controller';
import { InstalledPackages } from '@db/entities/InstalledPackages';
import type { User } from '@db/entities/User';
import { getLogger } from '@/Logger';
import { loadPublicApiVersions } from '@/PublicApi/';
import { issueJWT } from '@/auth/jwt';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';
import {
	AUTHLESS_ENDPOINTS,
	COMMUNITY_NODE_VERSION,
	COMMUNITY_PACKAGE_VERSION,
	PUBLIC_API_REST_PATH_SEGMENT,
	REST_PATH_SEGMENT,
} from './constants';
import { randomName } from './random';
import type {
	ApiPath,
	EndpointGroup,
	InstalledNodePayload,
	InstalledPackagePayload,
	PostgresSchemaSection,
} from './types';
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
import * as testDb from '../shared/testDb';

import { v4 as uuid } from 'uuid';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { PostHogClient } from '@/posthog';
import { variablesController } from '@/environments/variables/variables.controller';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import { handleLdapInit } from '@/Ldap/helpers';
import { Push } from '@/push';
import { setSamlLoginEnabled } from '@/sso/saml/samlHelpers';
import { SamlService } from '@/sso/saml/saml.service.ee';
import { SamlController } from '@/sso/saml/routes/saml.controller.ee';
import { EventBusController } from '@/eventbus/eventBus.controller';
import { License } from '@/License';
import { VersionControlService } from '@/environments/versionControl/versionControl.service.ee';
import { VersionControlController } from '@/environments/versionControl/versionControl.controller.ee';

export const mockInstance = <T>(
	ctor: new (...args: any[]) => T,
	data: DeepPartial<T> | undefined = undefined,
) => {
	const instance = mock<T>(data);
	Container.set(ctor, instance);
	return instance;
};

/**
 * Initialize a test server.
 */
export async function initTestServer({
	applyAuth = true,
	endpointGroups,
	enablePublicAPI = false,
}: {
	applyAuth?: boolean;
	endpointGroups?: EndpointGroup[];
	enablePublicAPI?: boolean;
}) {
	await testDb.init();
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
		publicApiEndpoint: PUBLIC_API_REST_PATH_SEGMENT,
		externalHooks: {},
	};

	const logger = getLogger();
	LoggerProxy.init(logger);

	// Mock all telemetry.
	mockInstance(InternalHooks);
	mockInstance(PostHogClient);

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', 'My JWT secret');
	config.set('userManagement.isInstanceOwnerSetUp', false);

	if (applyAuth) {
		setupAuthMiddlewares(
			testServer.app,
			AUTHLESS_ENDPOINTS,
			REST_PATH_SEGMENT,
			Db.collections.User,
		);
	}

	if (!endpointGroups) return testServer.app;

	if (
		endpointGroups.includes('credentials') ||
		endpointGroups.includes('me') ||
		endpointGroups.includes('users') ||
		endpointGroups.includes('passwordReset')
	) {
		testServer.externalHooks = Container.get(ExternalHooks);
	}

	const [routerEndpoints, functionEndpoints] = classifyEndpointGroups(endpointGroups);

	if (routerEndpoints.length) {
		const map: Record<string, express.Router | express.Router[] | any> = {
			credentials: { controller: credentialsController, path: 'credentials' },
			workflows: { controller: workflowsController, path: 'workflows' },
			license: { controller: licenseController, path: 'license' },
			variables: { controller: variablesController, path: 'variables' },
		};

		if (enablePublicAPI) {
			const { apiRouters } = await loadPublicApiVersions(testServer.publicApiEndpoint);
			map.publicApi = apiRouters;
		}

		for (const group of routerEndpoints) {
			if (group === 'publicApi') {
				testServer.app.use(...(map[group] as express.Router[]));
			} else {
				testServer.app.use(`/${testServer.restEndpoint}/${map[group].path}`, map[group].controller);
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
					registerController(testServer.app, config, new EventBusController());
					break;
				case 'auth':
					registerController(
						testServer.app,
						config,
						new AuthController({ config, logger, internalHooks, repositories }),
					);
					break;
				case 'ldap':
					Container.get(License).isLdapEnabled = () => true;
					await handleLdapInit();
					const { service, sync } = LdapManager.getInstance();
					registerController(
						testServer.app,
						config,
						new LdapController(service, sync, internalHooks),
					);
					break;
				case 'saml':
					await setSamlLoginEnabled(true);
					const samlService = Container.get(SamlService);
					registerController(testServer.app, config, new SamlController(samlService));
					break;
				case 'versionControl':
					const versionControlService = Container.get(VersionControlService);
					registerController(
						testServer.app,
						config,
						new VersionControlController(versionControlService),
					);
					break;
				case 'nodes':
					registerController(
						testServer.app,
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
						testServer.app,
						config,
						new MeController({ logger, externalHooks, internalHooks, repositories }),
					);
					break;
				case 'passwordReset':
					registerController(
						testServer.app,
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
						testServer.app,
						config,
						new OwnerController({ config, logger, internalHooks, repositories }),
					);
					break;
				case 'users':
					registerController(
						testServer.app,
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

	return testServer.app;
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

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize node types.
 */
export async function initActiveWorkflowRunner(): Promise<ActiveWorkflowRunner> {
	const workflowRunner = Container.get(ActiveWorkflowRunner);
	workflowRunner.init();
	return workflowRunner;
}

export function gitHubCredentialType(): ICredentialType {
	return {
		name: 'githubApi',
		displayName: 'Github API',
		documentationUrl: 'github',
		properties: [
			{
				displayName: 'Github Server',
				name: 'server',
				type: 'string',
				default: 'https://api.github.com',
				required: true,
				description: 'The server to connect to. Only has to be set if Github Enterprise is used.',
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				required: true,
				default: '',
			},
		],
	};
}

/**
 * Initialize node types.
 */
export async function initCredentialsTypes(): Promise<void> {
	Container.get(LoadNodesAndCredentials).loaded.credentials = {
		githubApi: {
			type: gitHubCredentialType(),
			sourcePath: '',
		},
	};
}

/**
 * Initialize node types.
 */
export async function initNodeTypes() {
	Container.get(LoadNodesAndCredentials).loaded.nodes = {
		'n8n-nodes-base.start': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Start',
					name: 'start',
					group: ['input'],
					version: 1,
					description: 'Starts the workflow execution from this node',
					defaults: {
						name: 'Start',
						color: '#553399',
					},
					inputs: [],
					outputs: ['main'],
					properties: [],
				},
				execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
					const items = this.getInputData();

					return this.prepareOutputData(items);
				},
			},
		},
		'n8n-nodes-base.cron': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Cron',
					name: 'cron',
					icon: 'fa:calendar',
					group: ['trigger', 'schedule'],
					version: 1,
					description: 'Triggers the workflow at a specific time',
					eventTriggerDescription: '',
					activationMessage:
						'Your cron trigger will now trigger executions on the schedule you have defined.',
					defaults: {
						name: 'Cron',
						color: '#00FF00',
					},
					inputs: [],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Trigger Times',
							name: 'triggerTimes',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
								multipleValueButtonText: 'Add Time',
							},
							default: {},
							description: 'Triggers for the workflow',
							placeholder: 'Add Cron Time',
							options: NodeHelpers.cronNodeOptions,
						},
					],
				},
				async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
					const triggerTimes = this.getNodeParameter('triggerTimes') as unknown as {
						item: TriggerTime[];
					};

					// Get all the trigger times
					const cronTimes = (triggerTimes.item || []).map(toCronExpression);

					// The trigger function to execute when the cron-time got reached
					// or when manually triggered
					const executeTrigger = () => {
						this.emit([this.helpers.returnJsonArray([{}])]);
					};

					const timezone = this.getTimezone();

					// Start the cron-jobs
					const cronJobs = cronTimes.map(
						(cronTime) => new CronJob(cronTime, executeTrigger, undefined, true, timezone),
					);

					// Stop the cron-jobs
					async function closeFunction() {
						for (const cronJob of cronJobs) {
							cronJob.stop();
						}
					}

					async function manualTriggerFunction() {
						executeTrigger();
					}

					return {
						closeFunction,
						manualTriggerFunction,
					};
				},
			},
		},
		'n8n-nodes-base.set': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set',
					name: 'set',
					icon: 'fa:pen',
					group: ['input'],
					version: 1,
					description: 'Sets values on items and optionally remove other values',
					defaults: {
						name: 'Set',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Keep Only Set',
							name: 'keepOnlySet',
							type: 'boolean',
							default: false,
							description:
								'If only the values set on this node should be kept and all others removed.',
						},
						{
							displayName: 'Values to Set',
							name: 'values',
							placeholder: 'Add Value',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
								sortable: true,
							},
							description: 'The value to set.',
							default: {},
							options: [
								{
									name: 'boolean',
									displayName: 'Boolean',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											description:
												'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'boolean',
											default: false,
											description: 'The boolean value to write in the property.',
										},
									],
								},
								{
									name: 'number',
									displayName: 'Number',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											description:
												'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'number',
											default: 0,
											description: 'The number value to write in the property.',
										},
									],
								},
								{
									name: 'string',
									displayName: 'String',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											description:
												'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'string',
											default: '',
											description: 'The string value to write in the property.',
										},
									],
								},
							],
						},

						{
							displayName: 'Options',
							name: 'options',
							type: 'collection',
							placeholder: 'Add Option',
							default: {},
							options: [
								{
									displayName: 'Dot Notation',
									name: 'dotNotation',
									type: 'boolean',
									default: true,
									description: `<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>
									`,
								},
							],
						},
					],
				},
				execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
					const items = this.getInputData();

					if (items.length === 0) {
						items.push({ json: {} });
					}

					const returnData: INodeExecutionData[] = [];

					let item: INodeExecutionData;
					let keepOnlySet: boolean;
					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
						item = items[itemIndex];
						const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

						const newItem: INodeExecutionData = {
							json: {},
						};

						if (keepOnlySet !== true) {
							if (item.binary !== undefined) {
								// Create a shallow copy of the binary data so that the old
								// data references which do not get changed still stay behind
								// but the incoming data does not get changed.
								newItem.binary = {};
								Object.assign(newItem.binary, item.binary);
							}

							newItem.json = JSON.parse(JSON.stringify(item.json));
						}

						// Add boolean values
						(this.getNodeParameter('values.boolean', itemIndex, []) as INodeParameters[]).forEach(
							(setItem) => {
								if (options.dotNotation === false) {
									newItem.json[setItem.name as string] = !!setItem.value;
								} else {
									set(newItem.json, setItem.name as string, !!setItem.value);
								}
							},
						);

						// Add number values
						(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach(
							(setItem) => {
								if (options.dotNotation === false) {
									newItem.json[setItem.name as string] = setItem.value;
								} else {
									set(newItem.json, setItem.name as string, setItem.value);
								}
							},
						);

						// Add string values
						(this.getNodeParameter('values.string', itemIndex, []) as INodeParameters[]).forEach(
							(setItem) => {
								if (options.dotNotation === false) {
									newItem.json[setItem.name as string] = setItem.value;
								} else {
									set(newItem.json, setItem.name as string, setItem.value);
								}
							},
						);

						returnData.push(newItem);
					}

					return this.prepareOutputData(returnData);
				},
			},
		},
	};
}

/**
 * Initialize a BinaryManager for test runs.
 */
export async function initBinaryManager() {
	const binaryDataConfig = config.getEnv('binaryDataManager');
	await BinaryDataManager.init(binaryDataConfig);
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
export function createAgent(
	app: express.Application,
	options?: { auth: boolean; user: User; apiPath?: ApiPath; version?: string | number },
) {
	const agent = request.agent(app);

	if (options?.apiPath === undefined || options?.apiPath === 'internal') {
		agent.use(prefix(REST_PATH_SEGMENT));
		if (options?.auth && options?.user) {
			const { token } = issueJWT(options.user);
			agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
		}
	}

	if (options?.apiPath === 'public') {
		agent.use(prefix(`${PUBLIC_API_REST_PATH_SEGMENT}/v${options?.version}`));

		if (options?.auth && options?.user.apiKey) {
			agent.set({ 'X-N8N-API-KEY': options.user.apiKey });
		}
	}

	return agent;
}

export function createAuthAgent(app: express.Application) {
	return (user: User) => createAgent(app, { auth: true, user });
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

export async function isInstanceOwnerSetUp() {
	const { value } = await Db.collections.Settings.findOneByOrFail({
		key: 'userManagement.isInstanceOwnerSetUp',
	});

	return Boolean(value);
}

export const setInstanceOwnerSetUp = async (value: boolean) => {
	config.set('userManagement.isInstanceOwnerSetUp', value);

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(value) },
	);
};

// ----------------------------------
//              misc
// ----------------------------------

export function getPostgresSchemaSection(
	schema = config.getSchema(),
): PostgresSchemaSection | null {
	for (const [key, value] of Object.entries(schema)) {
		if (key === 'postgresdb') {
			return value._cvtProperties;
		}
	}

	return null;
}

// ----------------------------------
//           community nodes
// ----------------------------------

export function installedPackagePayload(): InstalledPackagePayload {
	return {
		packageName: NODE_PACKAGE_PREFIX + randomName(),
		installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
	};
}

export function installedNodePayload(packageName: string): InstalledNodePayload {
	const nodeName = randomName();
	return {
		name: nodeName,
		type: nodeName,
		latestVersion: COMMUNITY_NODE_VERSION.CURRENT,
		package: packageName,
	};
}

export const emptyPackage = async () => {
	const installedPackage = new InstalledPackages();
	installedPackage.installedNodes = [];

	return installedPackage;
};

// ----------------------------------
//           workflow
// ----------------------------------

export function makeWorkflow(options?: {
	withPinData: boolean;
	withCredential?: { id: string; name: string };
}) {
	const workflow = new WorkflowEntity();

	const node: INode = {
		id: uuid(),
		name: 'Cron',
		type: 'n8n-nodes-base.cron',
		parameters: {},
		typeVersion: 1,
		position: [740, 240],
	};

	if (options?.withCredential) {
		node.credentials = {
			spotifyApi: options.withCredential,
		};
	}

	workflow.name = 'My Workflow';
	workflow.active = false;
	workflow.connections = {};
	workflow.nodes = [node];

	if (options?.withPinData) {
		workflow.pinData = MOCK_PINDATA;
	}

	return workflow;
}

export const MOCK_PINDATA = { Spotify: [{ json: { myKey: 'myValue' } }] };
