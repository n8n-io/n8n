/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-console */
import fs from 'fs';
import { Command, flags } from '@oclif/command';

import { BinaryDataManager, UserSettings } from 'n8n-core';

import { ITaskData, LoggerProxy, sleep } from 'n8n-workflow';

import { sep } from 'path';

import { diff } from 'json-diff';

import pick from 'lodash.pick';
import { getLogger } from '@/Logger';

import * as ActiveExecutions from '@/ActiveExecutions';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import * as Db from '@/Db';
import { ExternalHooks } from '@/ExternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooksManager } from '@/InternalHooksManager';
import { WorkflowRunner } from '@/WorkflowRunner';
import { IWorkflowDb, IWorkflowExecutionDataProcess } from '@/Interfaces';
import config from '@/config';
import { User } from '@db/entities/User';
import { getInstanceOwner } from '@/UserManagement/UserManagementHelper';
import { findCliWorkflowStart } from '@/utils';
import { initEvents } from '@/events';

const re = /\d+/;

export class ExecuteBatch extends Command {
	static description = '\nExecutes multiple workflows once';

	static cancelled = false;

	static workflowExecutionsProgress: IWorkflowExecutionProgress[][];

	static shallow = false;

	static compare: string;

	static snapshot: string;

	static concurrency = 1;

	static debug = false;

	static executionTimeout = 3 * 60 * 1000;

	static instanceOwner: User;

	static examples = [
		'$ n8n executeBatch',
		'$ n8n executeBatch --concurrency=10 --skipList=/data/skipList.txt',
		'$ n8n executeBatch --debug --output=/data/output.json',
		'$ n8n executeBatch --ids=10,13,15 --shortOutput',
		'$ n8n executeBatch --snapshot=/data/snapshots --shallow',
		'$ n8n executeBatch --compare=/data/previousExecutionData --retries=2',
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		debug: flags.boolean({
			description: 'Toggles on displaying all errors and debug messages.',
		}),
		ids: flags.string({
			description:
				'Specifies workflow IDs to get executed, separated by a comma or a file containing the ids',
		}),
		concurrency: flags.integer({
			default: 1,
			description:
				'How many workflows can run in parallel. Defaults to 1 which means no concurrency.',
		}),
		output: flags.string({
			description:
				'Enable execution saving, You must inform an existing folder to save execution via this param',
		}),
		snapshot: flags.string({
			description:
				'Enables snapshot saving. You must inform an existing folder to save snapshots via this param.',
		}),
		compare: flags.string({
			description:
				'Compares current execution with an existing snapshot. You must inform an existing folder where the snapshots are saved.',
		}),
		shallow: flags.boolean({
			description:
				'Compares only if attributes output from node are the same, with no regards to nested JSON objects.',
		}),
		skipList: flags.string({
			description: 'File containing a comma separated list of workflow IDs to skip.',
		}),
		retries: flags.integer({
			description: 'Retries failed workflows up to N tries. Default is 1. Set 0 to disable.',
			default: 1,
		}),
		shortOutput: flags.boolean({
			description: 'Omits the full execution information from output, displaying only summary.',
		}),
	};

	/**
	 * Gracefully handles exit.
	 * @param {boolean} skipExit Whether to skip exit or number according to received signal
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static async stopProcess(skipExit: boolean | number = false) {
		if (ExecuteBatch.cancelled) {
			process.exit(0);
		}

		ExecuteBatch.cancelled = true;
		const activeExecutionsInstance = ActiveExecutions.getInstance();
		const stopPromises = activeExecutionsInstance.getActiveExecutions().map(async (execution) => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			activeExecutionsInstance.stopExecution(execution.id);
		});

		await Promise.allSettled(stopPromises);

		setTimeout(() => {
			process.exit(0);
		}, 30000);

		let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

		let count = 0;
		while (executingWorkflows.length !== 0) {
			if (count++ % 4 === 0) {
				console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);
				executingWorkflows.map((execution) => {
					console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
				});
			}
			// eslint-disable-next-line no-await-in-loop
			await sleep(500);
			executingWorkflows = activeExecutionsInstance.getActiveExecutions();
		}
		// We may receive true but when called from `process.on`
		// we get the signal (SIGINT, etc.)
		if (skipExit !== true) {
			process.exit(0);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	formatJsonOutput(data: object) {
		return JSON.stringify(data, null, 2);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	shouldBeConsideredAsWarning(errorMessage: string) {
		const warningStrings = [
			'refresh token is invalid',
			'unable to connect to',
			'econnreset',
			'429',
			'econnrefused',
			'missing a required parameter',
			'insufficient credit balance',
			'request timed out',
			'status code 401',
		];

		// eslint-disable-next-line no-param-reassign
		errorMessage = errorMessage.toLowerCase();

		for (let i = 0; i < warningStrings.length; i++) {
			if (errorMessage.includes(warningStrings[i])) {
				return true;
			}
		}

		return false;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		process.once('SIGTERM', ExecuteBatch.stopProcess);
		process.once('SIGINT', ExecuteBatch.stopProcess);

		const logger = getLogger();
		LoggerProxy.init(logger);
		const binaryDataConfig = config.getEnv('binaryDataManager');
		await BinaryDataManager.init(binaryDataConfig, true);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ExecuteBatch);

		// Add event handlers
		initEvents();

		ExecuteBatch.debug = flags.debug;
		ExecuteBatch.concurrency = flags.concurrency || 1;

		const ids: string[] = [];
		const skipIds: string[] = [];

		if (flags.snapshot !== undefined) {
			if (fs.existsSync(flags.snapshot)) {
				if (!fs.lstatSync(flags.snapshot).isDirectory()) {
					console.log('The parameter --snapshot must be an existing directory');
					return;
				}
			} else {
				console.log('The parameter --snapshot must be an existing directory');
				return;
			}

			ExecuteBatch.snapshot = flags.snapshot;
		}
		if (flags.compare !== undefined) {
			if (fs.existsSync(flags.compare)) {
				if (!fs.lstatSync(flags.compare).isDirectory()) {
					console.log('The parameter --compare must be an existing directory');
					return;
				}
			} else {
				console.log('The parameter --compare must be an existing directory');
				return;
			}

			ExecuteBatch.compare = flags.compare;
		}

		if (flags.output !== undefined) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					console.log('The parameter --output must be a writable file');
					return;
				}
			}
		}

		if (flags.ids !== undefined) {
			if (fs.existsSync(flags.ids)) {
				const contents = fs.readFileSync(flags.ids, { encoding: 'utf-8' });
				ids.push(...contents.split(',').filter((id) => re.exec(id)));
			} else {
				const paramIds = flags.ids.split(',');
				const matchedIds = paramIds.filter((id) => re.exec(id));

				if (matchedIds.length === 0) {
					console.log(
						'The parameter --ids must be a list of numeric IDs separated by a comma or a file with this content.',
					);
					return;
				}

				ids.push(...matchedIds);
			}
		}

		if (flags.skipList !== undefined) {
			if (fs.existsSync(flags.skipList)) {
				const contents = fs.readFileSync(flags.skipList, { encoding: 'utf-8' });
				skipIds.push(...contents.split(',').filter((id) => re.exec(id)));
			} else {
				console.log('Skip list file not found. Exiting.');
				return;
			}
		}

		if (flags.shallow) {
			ExecuteBatch.shallow = true;
		}

		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();

		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();

		// Make sure the settings exist
		await UserSettings.prepareUserSettings();

		// Wait till the database is ready
		await startDbInitPromise;

		ExecuteBatch.instanceOwner = await getInstanceOwner();

		let allWorkflows;

		const query = Db.collections.Workflow.createQueryBuilder('workflows');

		if (ids.length > 0) {
			query.andWhere('workflows.id in (:...ids)', { ids });
		}

		if (skipIds.length > 0) {
			query.andWhere('workflows.id not in (:...skipIds)', { skipIds });
		}

		// eslint-disable-next-line prefer-const
		allWorkflows = (await query.getMany()) as IWorkflowDb[];

		if (ExecuteBatch.debug) {
			process.stdout.write(`Found ${allWorkflows.length} workflows to execute.\n`);
		}

		// Wait till the n8n-packages have been read
		await loadNodesAndCredentialsPromise;

		NodeTypes(loadNodesAndCredentials);
		const credentialTypes = CredentialTypes(loadNodesAndCredentials);

		// Load the credentials overwrites if any exist
		await CredentialsOverwrites(credentialTypes).init();

		// Load all external hooks
		const externalHooks = ExternalHooks();
		await externalHooks.init();

		// Add the found types to an instance other parts of the application can use
		const nodeTypes = NodeTypes(loadNodesAndCredentials);
		CredentialTypes(loadNodesAndCredentials);

		const instanceId = await UserSettings.getInstanceId();
		await InternalHooksManager.init(instanceId, nodeTypes);

		// Send a shallow copy of allWorkflows so we still have all workflow data.
		const results = await this.runTests([...allWorkflows]);

		let { retries } = flags;

		while (
			retries > 0 &&
			results.summary.warningExecutions + results.summary.failedExecutions > 0 &&
			!ExecuteBatch.cancelled
		) {
			const failedWorkflowIds = results.summary.errors.map((execution) => execution.workflowId);
			failedWorkflowIds.push(...results.summary.warnings.map((execution) => execution.workflowId));

			const newWorkflowList = allWorkflows.filter((workflow) =>
				failedWorkflowIds.includes(workflow.id),
			);

			// eslint-disable-next-line no-await-in-loop
			const retryResults = await this.runTests(newWorkflowList);

			this.mergeResults(results, retryResults);
			// By now, `results` has been updated with the new successful executions.
			retries--;
		}

		if (flags.output !== undefined) {
			fs.writeFileSync(flags.output, this.formatJsonOutput(results));
			console.log('\nExecution finished.');
			console.log('Summary:');
			console.log(`\tSuccess: ${results.summary.successfulExecutions}`);
			console.log(`\tFailures: ${results.summary.failedExecutions}`);
			console.log(`\tWarnings: ${results.summary.warningExecutions}`);
			console.log('\nNodes successfully tested:');
			Object.entries(results.coveredNodes).forEach(([nodeName, nodeCount]) => {
				console.log(`\t${nodeName}: ${nodeCount}`);
			});
			console.log('\nCheck the JSON file for more details.');
		} else if (flags.shortOutput) {
			console.log(
				this.formatJsonOutput({
					...results,
					executions: results.executions.filter(
						(execution) => execution.executionStatus !== 'success',
					),
				}),
			);
		} else {
			console.log(this.formatJsonOutput(results));
		}

		await ExecuteBatch.stopProcess(true);

		if (results.summary.failedExecutions > 0) {
			this.exit(1);
		}
		this.exit(0);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	mergeResults(results: IResult, retryResults: IResult) {
		if (retryResults.summary.successfulExecutions === 0) {
			// Nothing to replace.
			return;
		}

		// Find successful executions and replace them on previous result.
		retryResults.executions.forEach((newExecution) => {
			if (newExecution.executionStatus === 'success') {
				// Remove previous execution from list.
				results.executions = results.executions.filter(
					(previousExecutions) => previousExecutions.workflowId !== newExecution.workflowId,
				);

				const errorIndex = results.summary.errors.findIndex(
					(summaryInformation) => summaryInformation.workflowId === newExecution.workflowId,
				);
				if (errorIndex !== -1) {
					// This workflow errored previously. Decrement error count.
					results.summary.failedExecutions--;
					// Remove from the list of errors.
					results.summary.errors.splice(errorIndex, 1);
				}

				const warningIndex = results.summary.warnings.findIndex(
					(summaryInformation) => summaryInformation.workflowId === newExecution.workflowId,
				);
				if (warningIndex !== -1) {
					// This workflow errored previously. Decrement error count.
					results.summary.warningExecutions--;
					// Remove from the list of errors.
					results.summary.warnings.splice(warningIndex, 1);
				}
				// Increment successful executions count and push it to all executions array.
				results.summary.successfulExecutions++;
				results.executions.push(newExecution);
			}
		});
	}

	async runTests(allWorkflows: IWorkflowDb[]): Promise<IResult> {
		const result: IResult = {
			totalWorkflows: allWorkflows.length,
			summary: {
				failedExecutions: 0,
				warningExecutions: 0,
				successfulExecutions: 0,
				errors: [],
				warnings: [],
			},
			coveredNodes: {},
			executions: [],
		};

		if (ExecuteBatch.debug) {
			this.initializeLogs();
		}

		return new Promise(async (res) => {
			const promisesArray = [];
			for (let i = 0; i < ExecuteBatch.concurrency; i++) {
				const promise = new Promise(async (resolve) => {
					let workflow: IWorkflowDb | undefined;
					while (allWorkflows.length > 0) {
						workflow = allWorkflows.shift();
						if (ExecuteBatch.cancelled) {
							process.stdout.write(`Thread ${i + 1} resolving and quitting.`);
							resolve(true);
							break;
						}
						// This if shouldn't be really needed
						// but it's a concurrency precaution.
						if (workflow === undefined) {
							resolve(true);
							return;
						}

						if (ExecuteBatch.debug) {
							ExecuteBatch.workflowExecutionsProgress[i].push({
								workflowId: workflow.id,
								status: 'running',
							});
							this.updateStatus();
						}

						// eslint-disable-next-line @typescript-eslint/no-loop-func
						await this.startThread(workflow).then((executionResult) => {
							if (ExecuteBatch.debug) {
								ExecuteBatch.workflowExecutionsProgress[i].pop();
							}
							result.executions.push(executionResult);
							if (executionResult.executionStatus === 'success') {
								if (ExecuteBatch.debug) {
									ExecuteBatch.workflowExecutionsProgress[i].push({
										workflowId: workflow!.id,
										status: 'success',
									});
									this.updateStatus();
								}
								result.summary.successfulExecutions++;
								const nodeNames = Object.keys(executionResult.coveredNodes);

								nodeNames.map((nodeName) => {
									if (result.coveredNodes[nodeName] === undefined) {
										result.coveredNodes[nodeName] = 0;
									}
									result.coveredNodes[nodeName] += executionResult.coveredNodes[nodeName];
								});
							} else if (executionResult.executionStatus === 'warning') {
								result.summary.warningExecutions++;
								result.summary.warnings.push({
									workflowId: executionResult.workflowId,
									error: executionResult.error!,
								});
								if (ExecuteBatch.debug) {
									ExecuteBatch.workflowExecutionsProgress[i].push({
										workflowId: workflow!.id,
										status: 'warning',
									});
									this.updateStatus();
								}
							} else if (executionResult.executionStatus === 'error') {
								result.summary.failedExecutions++;
								result.summary.errors.push({
									workflowId: executionResult.workflowId,
									error: executionResult.error!,
								});
								if (ExecuteBatch.debug) {
									ExecuteBatch.workflowExecutionsProgress[i].push({
										workflowId: workflow!.id,
										status: 'error',
									});
									this.updateStatus();
								}
							} else {
								throw new Error('Wrong execution status - cannot proceed');
							}
						});
					}

					resolve(true);
				});

				promisesArray.push(promise);
			}

			await Promise.allSettled(promisesArray);

			res(result);
		});
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	updateStatus() {
		if (ExecuteBatch.cancelled) {
			return;
		}

		if (process.stdout.isTTY) {
			process.stdout.moveCursor(0, -ExecuteBatch.concurrency);
			process.stdout.cursorTo(0);
			process.stdout.clearLine(0);
		}

		ExecuteBatch.workflowExecutionsProgress.map((concurrentThread, index) => {
			let message = `${index + 1}: `;
			concurrentThread.map((executionItem, workflowIndex) => {
				let openColor = '\x1b[0m';
				const closeColor = '\x1b[0m';
				switch (executionItem.status) {
					case 'success':
						openColor = '\x1b[32m';
						break;
					case 'error':
						openColor = '\x1b[31m';
						break;
					case 'warning':
						openColor = '\x1b[33m';
						break;
					default:
						break;
				}
				message += `${workflowIndex > 0 ? ', ' : ''}${openColor}${
					executionItem.workflowId
				}${closeColor}`;
			});
			if (process.stdout.isTTY) {
				process.stdout.cursorTo(0);
				process.stdout.clearLine(0);
			}
			process.stdout.write(`${message}\n`);
		});
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	initializeLogs() {
		process.stdout.write('**********************************************\n');
		process.stdout.write('              n8n test workflows\n');
		process.stdout.write('**********************************************\n');
		process.stdout.write('\n');
		process.stdout.write('Batch number:\n');
		ExecuteBatch.workflowExecutionsProgress = [];
		for (let i = 0; i < ExecuteBatch.concurrency; i++) {
			ExecuteBatch.workflowExecutionsProgress.push([]);
			process.stdout.write(`${i + 1}: \n`);
		}
	}

	async startThread(workflowData: IWorkflowDb): Promise<IExecutionResult> {
		// This will be the object returned by the promise.
		// It will be updated according to execution progress below.
		const executionResult: IExecutionResult = {
			workflowId: workflowData.id,
			workflowName: workflowData.name,
			executionTime: 0,
			finished: false,
			executionStatus: 'running',
			coveredNodes: {},
		};

		// We have a cool feature here.
		// On each node, on the Settings tab in the node editor you can change
		// the `Notes` field to add special cases for comparison and snapshots.
		// You need to set one configuration per line with the following possible keys:
		// CAP_RESULTS_LENGTH=x where x is a number. Cap the number of rows from this node to x.
		// This means if you set CAP_RESULTS_LENGTH=1 we will have only 1 row in the output
		// IGNORED_PROPERTIES=x,y,z where x, y and z are JSON property names. Removes these
		//    properties from the JSON object (useful for optional properties that can
		//    cause the comparison to detect changes when not true).
		const nodeEdgeCases = {} as INodeSpecialCases;
		workflowData.nodes.forEach((node) => {
			executionResult.coveredNodes[node.type] = (executionResult.coveredNodes[node.type] || 0) + 1;
			if (node.notes !== undefined && node.notes !== '') {
				node.notes.split('\n').forEach((note) => {
					const parts = note.split('=');
					if (parts.length === 2) {
						if (nodeEdgeCases[node.name] === undefined) {
							nodeEdgeCases[node.name] = {} as INodeSpecialCase;
						}
						if (parts[0] === 'CAP_RESULTS_LENGTH') {
							nodeEdgeCases[node.name].capResults = parseInt(parts[1], 10);
						} else if (parts[0] === 'IGNORED_PROPERTIES') {
							nodeEdgeCases[node.name].ignoredProperties = parts[1]
								.split(',')
								.map((property) => property.trim());
						} else if (parts[0] === 'KEEP_ONLY_PROPERTIES') {
							nodeEdgeCases[node.name].keepOnlyProperties = parts[1]
								.split(',')
								.map((property) => property.trim());
						}
					}
				});
			}
		});

		return new Promise(async (resolve) => {
			let gotCancel = false;

			// Timeouts execution after 5 minutes.
			const timeoutTimer = setTimeout(() => {
				gotCancel = true;
				executionResult.error = 'Workflow execution timed out.';
				executionResult.executionStatus = 'warning';
				resolve(executionResult);
			}, ExecuteBatch.executionTimeout);

			try {
				const startingNode = findCliWorkflowStart(workflowData.nodes);

				const runData: IWorkflowExecutionDataProcess = {
					executionMode: 'cli',
					startNodes: [startingNode.name],
					workflowData,
					userId: ExecuteBatch.instanceOwner.id,
				};

				const workflowRunner = new WorkflowRunner();
				const executionId = await workflowRunner.run(runData);

				const activeExecutions = ActiveExecutions.getInstance();
				const data = await activeExecutions.getPostExecutePromise(executionId);
				if (gotCancel || ExecuteBatch.cancelled) {
					clearTimeout(timeoutTimer);
					// The promise was settled already so we simply ignore.
					return;
				}

				if (data === undefined) {
					executionResult.error = 'Workflow did not return any data.';
					executionResult.executionStatus = 'error';
				} else {
					executionResult.executionTime =
						(Date.parse(data.stoppedAt as unknown as string) -
							Date.parse(data.startedAt as unknown as string)) /
						1000;
					executionResult.finished = data?.finished !== undefined;

					if (data.data.resultData.error) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, no-prototype-builtins
						executionResult.error = data.data.resultData.error.hasOwnProperty('description')
							? // @ts-ignore
							  data.data.resultData.error.description
							: data.data.resultData.error.message;
						if (data.data.resultData.lastNodeExecuted !== undefined) {
							executionResult.error += ` on node ${data.data.resultData.lastNodeExecuted}`;
						}
						executionResult.executionStatus = 'error';

						if (this.shouldBeConsideredAsWarning(executionResult.error || '')) {
							executionResult.executionStatus = 'warning';
						}
					} else {
						if (ExecuteBatch.shallow) {
							// What this does is guarantee that top-level attributes
							// from the JSON are kept and the are the same type.

							// We convert nested JSON objects to a simple {object:true}
							// and we convert nested arrays to ['json array']

							// This reduces the chance of false positives but may
							// result in not detecting deeper changes.
							Object.keys(data.data.resultData.runData).map((nodeName: string) => {
								data.data.resultData.runData[nodeName].map((taskData: ITaskData) => {
									if (taskData.data === undefined) {
										return;
									}
									Object.keys(taskData.data).map((connectionName) => {
										const connection = taskData.data![connectionName];
										connection.map((executionDataArray) => {
											if (executionDataArray === null) {
												return;
											}

											if (
												nodeEdgeCases[nodeName] !== undefined &&
												nodeEdgeCases[nodeName].capResults !== undefined
											) {
												executionDataArray.splice(nodeEdgeCases[nodeName].capResults!);
											}

											executionDataArray.map((executionData) => {
												if (executionData.json === undefined) {
													return;
												}
												if (
													nodeEdgeCases[nodeName] !== undefined &&
													nodeEdgeCases[nodeName].ignoredProperties !== undefined
												) {
													nodeEdgeCases[nodeName].ignoredProperties!.forEach(
														(ignoredProperty) => delete executionData.json[ignoredProperty],
													);
												}

												let keepOnlyFields = [] as string[];
												if (
													nodeEdgeCases[nodeName] !== undefined &&
													nodeEdgeCases[nodeName].keepOnlyProperties !== undefined
												) {
													keepOnlyFields = nodeEdgeCases[nodeName].keepOnlyProperties!;
												}
												executionData.json =
													keepOnlyFields.length > 0
														? pick(executionData.json, keepOnlyFields)
														: executionData.json;
												const jsonProperties = executionData.json;

												const nodeOutputAttributes = Object.keys(jsonProperties);
												nodeOutputAttributes.map((attributeName) => {
													if (Array.isArray(jsonProperties[attributeName])) {
														jsonProperties[attributeName] = ['json array'];
													} else if (typeof jsonProperties[attributeName] === 'object') {
														jsonProperties[attributeName] = { object: true };
													}
												});
											});
										});
									});
								});
							});
						} else {
							// If not using shallow comparison then we only treat nodeEdgeCases.
							const specialCases = Object.keys(nodeEdgeCases);

							specialCases.forEach((nodeName) => {
								data.data.resultData.runData[nodeName].map((taskData: ITaskData) => {
									if (taskData.data === undefined) {
										return;
									}
									Object.keys(taskData.data).map((connectionName) => {
										const connection = taskData.data![connectionName];
										connection.map((executionDataArray) => {
											if (executionDataArray === null) {
												return;
											}

											if (nodeEdgeCases[nodeName].capResults !== undefined) {
												executionDataArray.splice(nodeEdgeCases[nodeName].capResults!);
											}

											if (nodeEdgeCases[nodeName].ignoredProperties !== undefined) {
												executionDataArray.map((executionData) => {
													if (executionData.json === undefined) {
														return;
													}
													nodeEdgeCases[nodeName].ignoredProperties!.forEach(
														(ignoredProperty) => delete executionData.json[ignoredProperty],
													);
												});
											}
										});
									});
								});
							});
						}

						const serializedData = this.formatJsonOutput(data);
						if (ExecuteBatch.compare === undefined) {
							executionResult.executionStatus = 'success';
						} else {
							const fileName = `${
								ExecuteBatch.compare.endsWith(sep)
									? ExecuteBatch.compare
									: ExecuteBatch.compare + sep
							}${workflowData.id}-snapshot.json`;
							if (fs.existsSync(fileName)) {
								const contents = fs.readFileSync(fileName, { encoding: 'utf-8' });

								const changes = diff(JSON.parse(contents), data, { keysOnly: true });

								if (changes !== undefined) {
									// If we had only additions with no removals
									// Then we treat as a warning and not an error.
									// To find this, we convert the object to JSON
									// and search for the `__deleted` string
									const changesJson = JSON.stringify(changes);
									if (changesJson.includes('__deleted')) {
										// we have structural changes. Report them.
										executionResult.error = 'Workflow may contain breaking changes';
										executionResult.changes = changes;
										executionResult.executionStatus = 'error';
									} else {
										executionResult.error =
											'Workflow contains new data that previously did not exist.';
										executionResult.changes = changes;
										executionResult.executionStatus = 'warning';
									}
								} else {
									executionResult.executionStatus = 'success';
								}
							} else {
								executionResult.error = 'Snapshot for not found.';
								executionResult.executionStatus = 'warning';
							}
						}
						// Save snapshots only after comparing - this is to make sure we're updating
						// After comparing to existing version.
						if (ExecuteBatch.snapshot !== undefined) {
							const fileName = `${
								ExecuteBatch.snapshot.endsWith(sep)
									? ExecuteBatch.snapshot
									: ExecuteBatch.snapshot + sep
							}${workflowData.id}-snapshot.json`;
							fs.writeFileSync(fileName, serializedData);
						}
					}
				}
			} catch (e) {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				executionResult.error = `Workflow failed to execute: ${e.message}`;
				executionResult.executionStatus = 'error';
			}
			clearTimeout(timeoutTimer);
			resolve(executionResult);
		});
	}
}
