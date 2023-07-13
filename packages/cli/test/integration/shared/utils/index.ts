import { Container } from 'typedi';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { CronJob } from 'cron';
import set from 'lodash/set';
import { BinaryDataManager, UserSettings } from 'n8n-core';
import type {
	ICredentialType,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	ITriggerFunctions,
	ITriggerResponse,
	TriggerTime,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { NodeHelpers, toCronExpression } from 'n8n-workflow';
import type request from 'supertest';
import { v4 as uuid } from 'uuid';

import config from '@/config';
import * as Db from '@/Db';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { AUTH_COOKIE_NAME } from '@/constants';

import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

export { mockInstance } from './mocking';
export { setupTestServer } from './testServer';

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize node types.
 */
export async function initActiveWorkflowRunner(): Promise<ActiveWorkflowRunner> {
	const workflowRunner = Container.get(ActiveWorkflowRunner);
	await workflowRunner.init();
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
				async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
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
				async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
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
						const options = this.getNodeParameter('options', itemIndex, {});

						const newItem: INodeExecutionData = {
							json: {},
						};

						if (!keepOnlySet) {
							if (item.binary !== undefined) {
								// Create a shallow copy of the binary data so that the old
								// data references which do not get changed still stay behind
								// but the incoming data does not get changed.
								newItem.binary = {};
								Object.assign(newItem.binary, item.binary);
							}

							newItem.json = deepCopy(item.json);
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
// TODO: this should be mocked
export async function initEncryptionKey() {
	const settingsPath = UserSettings.getUserSettingsPath();

	if (!existsSync(settingsPath)) {
		const userSettings = { encryptionKey: randomBytes(24).toString('base64') };
		await UserSettings.writeUserSettings(userSettings, settingsPath);
	}
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
//           community nodes
// ----------------------------------

export * from './communityNodes';

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
