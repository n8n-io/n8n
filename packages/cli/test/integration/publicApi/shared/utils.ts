import { CronJob } from 'cron';
import express from 'express';
import { set } from 'lodash';
import { BinaryDataManager } from 'n8n-core';
import type {
	ICredentialType,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeTypeData,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import request from 'supertest';

import config from '../../../../config';
import { ActiveWorkflowRunner, CredentialTypes, NodeTypes } from '../../../../src';
import type { User } from '../../../../src/databases/entities/User';
import { loadPublicApiVersions } from '../../../../src/PublicApi';
import type { TriggerTime } from '../../shared/types';
import { TestUtils } from '../../shared/utils';
import { PUBLIC_API_REST_PATH_SEGMENT } from './constants';

class PublicApiTestUtils extends TestUtils {
	/**
	 * Initialize a test server.
	 *
	 */
	async initTestServer() {
		const testServer = {
			app: express(),
			publicApiEndpoint: PUBLIC_API_REST_PATH_SEGMENT,
			externalHooks: {},
		};

		const { apiRouters } = await loadPublicApiVersions(testServer.publicApiEndpoint);
		const map: Record<string, express.Router | express.Router[] | any> = {
			publicApi: apiRouters,
		};

		testServer.app.use(...(map['publicApi'] as express.Router[]));

		return testServer.app;
	}

	// ----------------------------------
	//          initializers
	// ----------------------------------

	/**
	 * Initialize node types.
	 */
	async initActiveWorkflowRunner(): Promise<ActiveWorkflowRunner.ActiveWorkflowRunner> {
		const workflowRunner = ActiveWorkflowRunner.getInstance();
		workflowRunner.init();
		return workflowRunner;
	}

	gitHubCredentialType(): ICredentialType {
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
					description: 'The server to connect to. Only has to be set if Github Enterprise is used.',
				},
				{
					displayName: 'User',
					name: 'user',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Access Token',
					name: 'accessToken',
					type: 'string',
					default: '',
				},
			],
		};
	}

	/**
	 * Initialize node types.
	 */
	async initCredentialsTypes(): Promise<void> {
		const credentialTypes = CredentialTypes();
		await credentialTypes.init({
			githubApi: {
				type: this.gitHubCredentialType(),
				sourcePath: '',
			},
		});
	}

	/**
	 * Initialize node types.
	 */
	async initNodeTypes() {
		const types: INodeTypeData = {
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
								options: [
									{
										name: 'item',
										displayName: 'Item',
										values: [
											{
												displayName: 'Mode',
												name: 'mode',
												type: 'options',
												options: [
													{
														name: 'Every Minute',
														value: 'everyMinute',
													},
													{
														name: 'Every Hour',
														value: 'everyHour',
													},
													{
														name: 'Every Day',
														value: 'everyDay',
													},
													{
														name: 'Every Week',
														value: 'everyWeek',
													},
													{
														name: 'Every Month',
														value: 'everyMonth',
													},
													{
														name: 'Every X',
														value: 'everyX',
													},
													{
														name: 'Custom',
														value: 'custom',
													},
												],
												default: 'everyDay',
												description: 'How often to trigger.',
											},
											{
												displayName: 'Hour',
												name: 'hour',
												type: 'number',
												typeOptions: {
													minValue: 0,
													maxValue: 23,
												},
												displayOptions: {
													hide: {
														mode: ['custom', 'everyHour', 'everyMinute', 'everyX'],
													},
												},
												default: 14,
												description: 'The hour of the day to trigger (24h format).',
											},
											{
												displayName: 'Minute',
												name: 'minute',
												type: 'number',
												typeOptions: {
													minValue: 0,
													maxValue: 59,
												},
												displayOptions: {
													hide: {
														mode: ['custom', 'everyMinute', 'everyX'],
													},
												},
												default: 0,
												description: 'The minute of the day to trigger.',
											},
											{
												displayName: 'Day of Month',
												name: 'dayOfMonth',
												type: 'number',
												displayOptions: {
													show: {
														mode: ['everyMonth'],
													},
												},
												typeOptions: {
													minValue: 1,
													maxValue: 31,
												},
												default: 1,
												description: 'The day of the month to trigger.',
											},
											{
												displayName: 'Weekday',
												name: 'weekday',
												type: 'options',
												displayOptions: {
													show: {
														mode: ['everyWeek'],
													},
												},
												options: [
													{
														name: 'Monday',
														value: '1',
													},
													{
														name: 'Tuesday',
														value: '2',
													},
													{
														name: 'Wednesday',
														value: '3',
													},
													{
														name: 'Thursday',
														value: '4',
													},
													{
														name: 'Friday',
														value: '5',
													},
													{
														name: 'Saturday',
														value: '6',
													},
													{
														name: 'Sunday',
														value: '0',
													},
												],
												default: '1',
												description: 'The weekday to trigger.',
											},
											{
												displayName: 'Cron Expression',
												name: 'cronExpression',
												type: 'string',
												displayOptions: {
													show: {
														mode: ['custom'],
													},
												},
												default: '* * * * * *',
												description:
													'Use custom cron expression. Values and ranges as follows:<ul><li>Seconds: 0-59</li><li>Minutes: 0 - 59</li><li>Hours: 0 - 23</li><li>Day of Month: 1 - 31</li><li>Months: 0 - 11 (Jan - Dec)</li><li>Day of Week: 0 - 6 (Sun - Sat)</li></ul>.',
											},
											{
												displayName: 'Value',
												name: 'value',
												type: 'number',
												typeOptions: {
													minValue: 0,
													maxValue: 1000,
												},
												displayOptions: {
													show: {
														mode: ['everyX'],
													},
												},
												default: 2,
												description: 'All how many X minutes/hours it should trigger.',
											},
											{
												displayName: 'Unit',
												name: 'unit',
												type: 'options',
												displayOptions: {
													show: {
														mode: ['everyX'],
													},
												},
												options: [
													{
														name: 'Minutes',
														value: 'minutes',
													},
													{
														name: 'Hours',
														value: 'hours',
													},
												],
												default: 'hours',
												description: 'If it should trigger all X minutes or hours.',
											},
										],
									},
								],
							},
						],
					},
					async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
						const triggerTimes = this.getNodeParameter('triggerTimes') as unknown as {
							item: TriggerTime[];
						};

						// Define the order the cron-time-parameter appear
						const parameterOrder = [
							'second', // 0 - 59
							'minute', // 0 - 59
							'hour', // 0 - 23
							'dayOfMonth', // 1 - 31
							'month', // 0 - 11(Jan - Dec)
							'weekday', // 0 - 6(Sun - Sat)
						];

						// Get all the trigger times
						const cronTimes: string[] = [];
						let cronTime: string[];
						let parameterName: string;
						if (triggerTimes.item !== undefined) {
							for (const item of triggerTimes.item) {
								cronTime = [];
								if (item.mode === 'custom') {
									cronTimes.push(item.cronExpression as string);
									continue;
								}
								if (item.mode === 'everyMinute') {
									cronTimes.push(`${Math.floor(Math.random() * 60).toString()} * * * * *`);
									continue;
								}
								if (item.mode === 'everyX') {
									if (item.unit === 'minutes') {
										cronTimes.push(
											`${Math.floor(Math.random() * 60).toString()} */${item.value} * * * *`,
										);
									} else if (item.unit === 'hours') {
										cronTimes.push(
											`${Math.floor(Math.random() * 60).toString()} 0 */${item.value} * * *`,
										);
									}
									continue;
								}

								for (parameterName of parameterOrder) {
									if (item[parameterName] !== undefined) {
										// Value is set so use it
										cronTime.push(item[parameterName] as string);
									} else if (parameterName === 'second') {
										// For seconds we use by default a random one to make sure to
										// balance the load a little bit over time
										cronTime.push(Math.floor(Math.random() * 60).toString());
									} else {
										// For all others set "any"
										cronTime.push('*');
									}
								}

								cronTimes.push(cronTime.join(' '));
							}
						}

						// The trigger function to execute when the cron-time got reached
						// or when manually triggered
						const executeTrigger = () => {
							this.emit([this.helpers.returnJsonArray([{}])]);
						};

						const timezone = this.getTimezone();

						// Start the cron-jobs
						const cronJobs: CronJob[] = [];
						for (const cronTime of cronTimes) {
							cronJobs.push(new CronJob(cronTime, executeTrigger, undefined, true, timezone));
						}

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

		await NodeTypes().init(types);
	}

	/**
	 * Initialize a BinaryManager for test runs.
	 */
	async initBinaryManager() {
		const binaryDataConfig = config.getEnv('binaryDataManager');
		await BinaryDataManager.init(binaryDataConfig);
	}

	// ----------------------------------
	//           request agent
	// ----------------------------------

	/**
	 * Create a request agent, optionally with an auth header.
	 */
	// @ts-ignore
	createAgent(app: express.Application, options?: { user: User; version: string | number }) {
		const agent = request.agent(app);

		agent.use(this.prefix(`${PUBLIC_API_REST_PATH_SEGMENT}/v${options?.version}`));

		if (options?.user.apiKey) {
			agent.set({ 'X-N8N-API-KEY': options.user.apiKey });
		}

		return agent;
	}

	/**
	 * Wrapper for agent creation.
	 */
	// @ts-ignore
	createAuthAgent(app: express.Application, { version }: { version: string | number }) {
		return (user: User) => this.createAgent(app, { user, version });
	}
}

export const utils = new PublicApiTestUtils();
