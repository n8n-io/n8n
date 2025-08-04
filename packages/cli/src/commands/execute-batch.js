'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
var ExecuteBatch_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExecuteBatch = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const fs_1 = __importDefault(require('fs'));
const json_diff_1 = require('json-diff');
const pick_1 = __importDefault(require('lodash/pick'));
const n8n_workflow_1 = require('n8n-workflow');
const os_1 = __importDefault(require('os'));
const path_1 = require('path');
const zod_1 = require('zod');
const active_executions_1 = require('@/active-executions');
const ownership_service_1 = require('@/services/ownership.service');
const utils_1 = require('@/utils');
const workflow_runner_1 = require('@/workflow-runner');
const base_command_1 = require('./base-command');
const config_1 = __importDefault(require('../config'));
const re = /\d+/;
const flagsSchema = zod_1.z.object({
	debug: zod_1.z
		.boolean()
		.describe('Toggles on displaying all errors and debug messages.')
		.default(false),
	ids: zod_1.z
		.string()
		.describe(
			'Specifies workflow IDs to get executed, separated by a comma or a file containing the ids',
		)
		.optional(),
	concurrency: zod_1.z
		.number()
		.int()
		.default(1)
		.describe('How many workflows can run in parallel. Defaults to 1 which means no concurrency.'),
	output: zod_1.z
		.string()
		.describe(
			'Enable execution saving, You must inform an existing folder to save execution via this param',
		)
		.optional(),
	snapshot: zod_1.z
		.string()
		.describe(
			'Enables snapshot saving. You must inform an existing folder to save snapshots via this param.',
		)
		.optional(),
	compare: zod_1.z
		.string()
		.describe(
			'Compares current execution with an existing snapshot. You must inform an existing folder where the snapshots are saved.',
		)
		.optional(),
	shallow: zod_1.z
		.boolean()
		.describe(
			'Compares only if attributes output from node are the same, with no regards to nested JSON objects.',
		)
		.optional(),
	githubWorkflow: zod_1.z
		.boolean()
		.describe(
			'Enables more lenient comparison for GitHub workflows. This is useful for reducing false positives when comparing Test workflows.',
		)
		.optional(),
	skipList: zod_1.z
		.string()
		.describe('File containing a comma separated list of workflow IDs to skip.')
		.optional(),
	retries: zod_1.z
		.number()
		.int()
		.default(1)
		.describe('Retries failed workflows up to N tries. Default is 1. Set 0 to disable.'),
	shortOutput: zod_1.z
		.boolean()
		.describe('Omits the full execution information from output, displaying only summary.')
		.optional(),
});
let ExecuteBatch = (ExecuteBatch_1 = class ExecuteBatch extends base_command_1.BaseCommand {
	constructor() {
		super(...arguments);
		this.needsCommunityPackages = true;
		this.needsTaskRunner = true;
	}
	async stopProcess(skipExit = false) {
		if (ExecuteBatch_1.cancelled) {
			process.exit(0);
		}
		ExecuteBatch_1.cancelled = true;
		await di_1.Container.get(active_executions_1.ActiveExecutions).shutdown(true);
		if (skipExit !== true) {
			process.exit(0);
		}
	}
	formatJsonOutput(data) {
		return JSON.stringify(data, null, 2);
	}
	shouldBeConsideredAsWarning(errorMessage) {
		const warningStrings = [
			'refresh token is invalid',
			'unable to connect to',
			'econnreset',
			'429',
			'econnrefused',
			'missing a required parameter',
			'insufficient credit balance',
			'internal server error',
			'503',
			'502',
			'504',
			'insufficient balance',
			'request timed out',
			'status code 401',
		];
		errorMessage = errorMessage.toLowerCase();
		for (let i = 0; i < warningStrings.length; i++) {
			if (errorMessage.includes(warningStrings[i])) {
				return true;
			}
		}
		return false;
	}
	async init() {
		await super.init();
		await this.initBinaryDataService();
		await this.initDataDeduplicationService();
		await this.initExternalHooks();
	}
	async run() {
		const { flags } = this;
		ExecuteBatch_1.debug = flags.debug;
		ExecuteBatch_1.concurrency = flags.concurrency || 1;
		const ids = [];
		const skipIds = [];
		if (flags.snapshot !== undefined) {
			if (fs_1.default.existsSync(flags.snapshot)) {
				if (!fs_1.default.lstatSync(flags.snapshot).isDirectory()) {
					this.logger.error('The parameter --snapshot must be an existing directory');
					return;
				}
			} else {
				this.logger.error('The parameter --snapshot must be an existing directory');
				return;
			}
			ExecuteBatch_1.snapshot = flags.snapshot;
		}
		if (flags.compare !== undefined) {
			if (fs_1.default.existsSync(flags.compare)) {
				if (!fs_1.default.lstatSync(flags.compare).isDirectory()) {
					this.logger.error('The parameter --compare must be an existing directory');
					return;
				}
			} else {
				this.logger.error('The parameter --compare must be an existing directory');
				return;
			}
			ExecuteBatch_1.compare = flags.compare;
		}
		if (flags.output !== undefined) {
			if (fs_1.default.existsSync(flags.output)) {
				if (fs_1.default.lstatSync(flags.output).isDirectory()) {
					this.logger.error('The parameter --output must be a writable file');
					return;
				}
			}
		}
		if (flags.ids !== undefined) {
			if (fs_1.default.existsSync(flags.ids)) {
				const contents = fs_1.default.readFileSync(flags.ids, { encoding: 'utf-8' });
				ids.push(
					...contents
						.trimEnd()
						.split(',')
						.filter((id) => re.exec(id)),
				);
			} else {
				const paramIds = flags.ids.split(',');
				const matchedIds = paramIds.filter((id) => re.exec(id));
				if (matchedIds.length === 0) {
					this.logger.error(
						'The parameter --ids must be a list of numeric IDs separated by a comma or a file with this content.',
					);
					return;
				}
				ids.push(...matchedIds);
			}
		}
		if (flags.skipList !== undefined) {
			if (fs_1.default.existsSync(flags.skipList)) {
				const contents = fs_1.default.readFileSync(flags.skipList, { encoding: 'utf-8' });
				try {
					const parsedSkipList = JSON.parse(contents);
					parsedSkipList.forEach((item) => {
						skipIds.push(item.workflowId);
					});
				} catch (error) {
					this.logger.error('Skip list file is not a valid JSON. Exiting.');
					return;
				}
			} else {
				this.logger.error('Skip list file not found. Exiting.');
				return;
			}
		}
		if (flags.shallow) {
			ExecuteBatch_1.shallow = true;
		}
		if (flags.githubWorkflow) {
			ExecuteBatch_1.githubWorkflow = true;
		}
		ExecuteBatch_1.instanceOwner = await di_1.Container.get(
			ownership_service_1.OwnershipService,
		).getInstanceOwner();
		const query = di_1.Container.get(db_1.WorkflowRepository).createQueryBuilder('workflows');
		if (ids.length > 0) {
			query.andWhere('workflows.id in (:...ids)', { ids });
		}
		if (skipIds.length > 0) {
			query.andWhere('workflows.id not in (:...skipIds)', { skipIds });
		}
		const allWorkflows = await query.getMany();
		if (ExecuteBatch_1.debug) {
			process.stdout.write(`Found ${allWorkflows.length} workflows to execute.\n`);
		}
		const results = await this.runTests([...allWorkflows]);
		let { retries } = flags;
		while (
			retries > 0 &&
			results.summary.warningExecutions + results.summary.failedExecutions > 0 &&
			!ExecuteBatch_1.cancelled
		) {
			const failedWorkflowIds = results.summary.errors.map((execution) => execution.workflowId);
			failedWorkflowIds.push(...results.summary.warnings.map((execution) => execution.workflowId));
			const newWorkflowList = allWorkflows.filter((workflow) =>
				failedWorkflowIds.includes(workflow.id),
			);
			const retryResults = await this.runTests(newWorkflowList);
			this.mergeResults(results, retryResults);
			retries--;
		}
		if (flags.output !== undefined) {
			fs_1.default.writeFileSync(flags.output, this.formatJsonOutput(results));
			this.logger.info('\nExecution finished.');
			this.logger.info('Summary:');
			this.logger.info(`\tSuccess: ${results.summary.successfulExecutions}`);
			this.logger.info(`\tFailures: ${results.summary.failedExecutions}`);
			this.logger.info(`\tWarnings: ${results.summary.warningExecutions}`);
			this.logger.info('\nNodes successfully tested:');
			Object.entries(results.coveredNodes).forEach(([nodeName, nodeCount]) => {
				this.logger.info(`\t${nodeName}: ${nodeCount}`);
			});
			this.logger.info('\nCheck the JSON file for more details.');
		} else if (flags.shortOutput) {
			this.logger.info(
				this.formatJsonOutput({
					...results,
					executions: results.executions.filter(
						(execution) => execution.executionStatus !== 'success',
					),
				}),
			);
		} else {
			this.logger.info(this.formatJsonOutput(results));
		}
		await this.stopProcess(true);
		if (results.summary.failedExecutions > 0) {
			process.exit(1);
		}
	}
	mergeResults(results, retryResults) {
		if (retryResults.summary.successfulExecutions === 0) {
			return;
		}
		retryResults.executions.forEach((newExecution) => {
			if (newExecution.executionStatus === 'success') {
				results.executions = results.executions.filter(
					(previousExecutions) => previousExecutions.workflowId !== newExecution.workflowId,
				);
				const errorIndex = results.summary.errors.findIndex(
					(summaryInformation) => summaryInformation.workflowId === newExecution.workflowId,
				);
				if (errorIndex !== -1) {
					results.summary.failedExecutions--;
					results.summary.errors.splice(errorIndex, 1);
				}
				const warningIndex = results.summary.warnings.findIndex(
					(summaryInformation) => summaryInformation.workflowId === newExecution.workflowId,
				);
				if (warningIndex !== -1) {
					results.summary.warningExecutions--;
					results.summary.warnings.splice(warningIndex, 1);
				}
				results.summary.successfulExecutions++;
				results.executions.push(newExecution);
			}
		});
	}
	async runTests(allWorkflows) {
		const result = {
			totalWorkflows: allWorkflows.length,
			slackMessage: '',
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
		if (ExecuteBatch_1.debug) {
			this.initializeLogs();
		}
		return await new Promise(async (res) => {
			const promisesArray = [];
			for (let i = 0; i < ExecuteBatch_1.concurrency; i++) {
				const promise = new Promise(async (resolve) => {
					let workflow;
					while (allWorkflows.length > 0) {
						workflow = allWorkflows.shift();
						if (ExecuteBatch_1.cancelled) {
							process.stdout.write(`Thread ${i + 1} resolving and quitting.`);
							resolve(true);
							break;
						}
						if (workflow === undefined) {
							resolve(true);
							return;
						}
						if (ExecuteBatch_1.debug) {
							ExecuteBatch_1.workflowExecutionsProgress[i].push({
								workflowId: workflow.id,
								status: 'running',
							});
							this.updateStatus();
						}
						await this.startThread(workflow).then((executionResult) => {
							if (ExecuteBatch_1.debug) {
								ExecuteBatch_1.workflowExecutionsProgress[i].pop();
							}
							result.executions.push(executionResult);
							if (executionResult.executionStatus === 'success') {
								if (ExecuteBatch_1.debug) {
									ExecuteBatch_1.workflowExecutionsProgress[i].push({
										workflowId: workflow.id,
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
									error: executionResult.error,
								});
								if (ExecuteBatch_1.debug) {
									ExecuteBatch_1.workflowExecutionsProgress[i].push({
										workflowId: workflow.id,
										status: 'warning',
									});
									this.updateStatus();
								}
							} else if (executionResult.executionStatus === 'error') {
								result.summary.failedExecutions++;
								result.summary.errors.push({
									workflowId: executionResult.workflowId,
									error: executionResult.error,
								});
								if (ExecuteBatch_1.debug) {
									ExecuteBatch_1.workflowExecutionsProgress[i].push({
										workflowId: workflow.id,
										status: 'error',
									});
									this.updateStatus();
								}
							} else {
								throw new n8n_workflow_1.UnexpectedError('Wrong execution status - cannot proceed');
							}
						});
					}
					resolve(true);
				});
				promisesArray.push(promise);
			}
			await Promise.allSettled(promisesArray);
			if (ExecuteBatch_1.githubWorkflow) {
				if (result.summary.errors.length < 6) {
					const errorMessage = result.summary.errors.map((error) => {
						return `*${error.workflowId}*: ${error.error}`;
					});
					result.slackMessage = `*${result.summary.errors.length} Executions errors*. Workflows failing: ${errorMessage.join(' ')} `;
				} else {
					result.slackMessage = `*${result.summary.errors.length} Executions errors*`;
				}
				this.setOutput('slackMessage', JSON.stringify(result.slackMessage));
			}
			res(result);
		});
	}
	setOutput(key, value) {
		const output = process.env.GITHUB_OUTPUT;
		fs_1.default.appendFileSync(output, `${key}=${value}${os_1.default.EOL}`);
	}
	updateStatus() {
		if (ExecuteBatch_1.cancelled) {
			return;
		}
		if (process.stdout.isTTY) {
			process.stdout.moveCursor(0, -ExecuteBatch_1.concurrency);
			process.stdout.cursorTo(0);
			process.stdout.clearLine(0);
		}
		ExecuteBatch_1.workflowExecutionsProgress.map((concurrentThread, index) => {
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
				message += `${workflowIndex > 0 ? ', ' : ''}${openColor}${executionItem.workflowId}${closeColor}`;
			});
			if (process.stdout.isTTY) {
				process.stdout.cursorTo(0);
				process.stdout.clearLine(0);
			}
			process.stdout.write(`${message}\n`);
		});
	}
	initializeLogs() {
		process.stdout.write('**********************************************\n');
		process.stdout.write('              n8n test workflows\n');
		process.stdout.write('**********************************************\n');
		process.stdout.write('\n');
		process.stdout.write('Batch number:\n');
		ExecuteBatch_1.workflowExecutionsProgress = [];
		for (let i = 0; i < ExecuteBatch_1.concurrency; i++) {
			ExecuteBatch_1.workflowExecutionsProgress.push([]);
			process.stdout.write(`${i + 1}: \n`);
		}
	}
	async startThread(workflowData) {
		const executionResult = {
			workflowId: workflowData.id,
			workflowName: workflowData.name,
			executionTime: 0,
			finished: false,
			executionStatus: 'running',
			coveredNodes: {},
		};
		const nodeEdgeCases = {};
		workflowData.nodes.forEach((node) => {
			executionResult.coveredNodes[node.type] = (executionResult.coveredNodes[node.type] || 0) + 1;
			if (node.notes !== undefined && node.notes !== '') {
				node.notes.split('\n').forEach((note) => {
					const parts = note.split('=');
					if (parts.length === 2) {
						if (nodeEdgeCases[node.name] === undefined) {
							nodeEdgeCases[node.name] = {};
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
		const workflowRunner = di_1.Container.get(workflow_runner_1.WorkflowRunner);
		if (config_1.default.getEnv('executions.mode') === 'queue') {
			this.logger.warn('`executeBatch` does not support queue mode. Falling back to regular mode.');
			workflowRunner.setExecutionMode('regular');
		}
		return await new Promise(async (resolve) => {
			let gotCancel = false;
			const timeoutTimer = setTimeout(() => {
				gotCancel = true;
				executionResult.error = 'Workflow execution timed out.';
				executionResult.executionStatus = 'warning';
				resolve(executionResult);
			}, ExecuteBatch_1.executionTimeout);
			try {
				const startingNode = (0, utils_1.findCliWorkflowStart)(workflowData.nodes);
				const runData = {
					executionMode: 'cli',
					startNodes: [{ name: startingNode.name, sourceData: null }],
					workflowData,
					userId: ExecuteBatch_1.instanceOwner.id,
				};
				const executionId = await workflowRunner.run(runData);
				const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
				const data = await activeExecutions.getPostExecutePromise(executionId);
				if (gotCancel || ExecuteBatch_1.cancelled) {
					clearTimeout(timeoutTimer);
					return;
				}
				if (data === undefined) {
					executionResult.error = 'Workflow did not return any data.';
					executionResult.executionStatus = 'error';
				} else {
					executionResult.executionTime =
						(Date.parse(data.stoppedAt) - Date.parse(data.startedAt)) / 1000;
					executionResult.finished = data?.finished !== undefined;
					const resultError = data.data.resultData.error;
					if (resultError) {
						executionResult.error = resultError.description || resultError.message;
						if (data.data.resultData.lastNodeExecuted !== undefined) {
							executionResult.error += ` on node ${data.data.resultData.lastNodeExecuted}`;
						}
						executionResult.executionStatus = 'error';
						if (this.shouldBeConsideredAsWarning(executionResult.error || '')) {
							executionResult.executionStatus = 'warning';
						}
					} else {
						if (ExecuteBatch_1.shallow) {
							Object.keys(data.data.resultData.runData).map((nodeName) => {
								data.data.resultData.runData[nodeName].map((taskData) => {
									if (taskData.data === undefined) {
										return;
									}
									Object.keys(taskData.data).map((connectionName) => {
										const connection = taskData.data[connectionName];
										connection.map((executionDataArray) => {
											if (executionDataArray === null) {
												return;
											}
											const { capResults, ignoredProperties, keepOnlyProperties } =
												nodeEdgeCases[nodeName] || {};
											if (capResults !== undefined) {
												executionDataArray.splice(capResults);
											}
											executionDataArray.map((executionData) => {
												if (executionData.json === undefined) {
													return;
												}
												if (ignoredProperties !== undefined) {
													ignoredProperties.forEach(
														(ignoredProperty) => delete executionData.json[ignoredProperty],
													);
												}
												let keepOnlyFields = [];
												if (keepOnlyProperties !== undefined) {
													keepOnlyFields = keepOnlyProperties;
												}
												executionData.json =
													keepOnlyFields.length > 0
														? (0, pick_1.default)(executionData.json, keepOnlyFields)
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
							const specialCases = Object.keys(nodeEdgeCases);
							specialCases.forEach((nodeName) => {
								data.data.resultData.runData[nodeName].map((taskData) => {
									if (taskData.data === undefined) {
										return;
									}
									Object.keys(taskData.data).map((connectionName) => {
										const connection = taskData.data[connectionName];
										connection.map((executionDataArray) => {
											if (executionDataArray === null) {
												return;
											}
											const capResults = nodeEdgeCases[nodeName].capResults;
											if (capResults !== undefined) {
												executionDataArray.splice(capResults);
											}
											if (nodeEdgeCases[nodeName].ignoredProperties !== undefined) {
												executionDataArray.map((executionData) => {
													if (executionData.json === undefined) {
														return;
													}
													nodeEdgeCases[nodeName].ignoredProperties.forEach(
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
						if (ExecuteBatch_1.compare === undefined) {
							executionResult.executionStatus = 'success';
						} else {
							const fileName = `${
								ExecuteBatch_1.compare.endsWith(path_1.sep)
									? ExecuteBatch_1.compare
									: ExecuteBatch_1.compare + path_1.sep
							}${workflowData.id}-snapshot.json`;
							if (fs_1.default.existsSync(fileName)) {
								const contents = fs_1.default.readFileSync(fileName, { encoding: 'utf-8' });
								const expected = (0, n8n_workflow_1.jsonParse)(contents);
								const received = (0, n8n_workflow_1.jsonParse)(serializedData);
								const changes = (0, json_diff_1.diff)(expected, received, { keysOnly: true });
								if (changes !== undefined) {
									const changesJson = JSON.stringify(changes);
									if (changesJson.includes('__deleted')) {
										if (ExecuteBatch_1.githubWorkflow) {
											const deletedChanges = changesJson.match(/__deleted/g) ?? [];
											executionResult.error = `Workflow contains ${deletedChanges.length} deleted data.`;
										} else {
											executionResult.error = 'Workflow may contain breaking changes';
										}
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
						if (ExecuteBatch_1.snapshot !== undefined) {
							const fileName = `${
								ExecuteBatch_1.snapshot.endsWith(path_1.sep)
									? ExecuteBatch_1.snapshot
									: ExecuteBatch_1.snapshot + path_1.sep
							}${workflowData.id}-snapshot.json`;
							fs_1.default.writeFileSync(fileName, serializedData);
						}
					}
				}
			} catch (e) {
				this.errorReporter.error(e, {
					extra: {
						workflowId: workflowData.id,
					},
				});
				executionResult.error = `Workflow failed to execute: ${e.message}`;
				executionResult.executionStatus = 'error';
			}
			clearTimeout(timeoutTimer);
			resolve(executionResult);
		});
	}
});
exports.ExecuteBatch = ExecuteBatch;
ExecuteBatch.cancelled = false;
ExecuteBatch.shallow = false;
ExecuteBatch.concurrency = 1;
ExecuteBatch.githubWorkflow = false;
ExecuteBatch.debug = false;
ExecuteBatch.executionTimeout = 3 * 60 * 1000;
ExecuteBatch.aliases = ['executeBatch'];
exports.ExecuteBatch =
	ExecuteBatch =
	ExecuteBatch_1 =
		__decorate(
			[
				(0, decorators_1.Command)({
					name: 'execute-batch',
					description: 'Executes multiple workflows once',
					examples: [
						'',
						'--concurrency=10 --skipList=/data/skipList.json',
						'--debug --output=/data/output.json',
						'--ids=10,13,15 --shortOutput',
						'--snapshot=/data/snapshots --shallow',
						'--compare=/data/previousExecutionData --retries=2',
					],
					flagsSchema,
				}),
			],
			ExecuteBatch,
		);
//# sourceMappingURL=execute-batch.js.map
