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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
var TestRunnerService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.TestRunnerService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = __importDefault(require('node:assert'));
const active_executions_1 = require('@/active-executions');
const config_1 = __importDefault(require('@/config'));
const errors_ee_1 = require('@/evaluation.ee/test-runner/errors.ee');
const utils_ee_1 = require('@/evaluation.ee/test-runner/utils.ee');
const telemetry_1 = require('@/telemetry');
const workflow_runner_1 = require('@/workflow-runner');
const evaluation_metrics_ee_1 = require('./evaluation-metrics.ee');
let TestRunnerService = (TestRunnerService_1 = class TestRunnerService {
	constructor(
		logger,
		telemetry,
		workflowRepository,
		workflowRunner,
		activeExecutions,
		testRunRepository,
		testCaseExecutionRepository,
		errorReporter,
	) {
		this.logger = logger;
		this.telemetry = telemetry;
		this.workflowRepository = workflowRepository;
		this.workflowRunner = workflowRunner;
		this.activeExecutions = activeExecutions;
		this.testRunRepository = testRunRepository;
		this.testCaseExecutionRepository = testCaseExecutionRepository;
		this.errorReporter = errorReporter;
		this.abortControllers = new Map();
	}
	findEvaluationTriggerNode(workflow) {
		return workflow.nodes.find((node) => node.type === n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE);
	}
	validateEvaluationTriggerNode(workflow) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		if (!triggerNode) {
			throw new errors_ee_1.TestRunError('EVALUATION_TRIGGER_NOT_FOUND');
		}
		if (
			!triggerNode.credentials ||
			!(0, utils_ee_1.checkNodeParameterNotEmpty)(triggerNode.parameters?.documentId) ||
			!(0, utils_ee_1.checkNodeParameterNotEmpty)(triggerNode.parameters?.sheetName)
		) {
			throw new errors_ee_1.TestRunError('EVALUATION_TRIGGER_NOT_CONFIGURED', {
				node_name: triggerNode.name,
			});
		}
		if (triggerNode?.disabled) {
			throw new errors_ee_1.TestRunError('EVALUATION_TRIGGER_DISABLED');
		}
	}
	validateSetMetricsNodes(workflow) {
		const metricsNodes = TestRunnerService_1.getEvaluationMetricsNodes(workflow);
		if (metricsNodes.length === 0) {
			throw new errors_ee_1.TestRunError('SET_METRICS_NODE_NOT_FOUND');
		}
		const unconfiguredMetricsNode = metricsNodes.find((node) => {
			if (node.disabled === true || !node.parameters) {
				return true;
			}
			if (node.typeVersion >= 4.7 && !node.parameters.metric) {
				return true;
			}
			const isCustomMetricsMode =
				node.typeVersion >= 4.7 ? node.parameters.metric === 'customMetrics' : true;
			if (isCustomMetricsMode) {
				return (
					!node.parameters.metrics ||
					node.parameters.metrics.assignments?.length === 0 ||
					node.parameters.metrics.assignments?.some(
						(assignment) => !assignment.name || assignment.value === null,
					)
				);
			}
			return false;
		});
		if (unconfiguredMetricsNode) {
			throw new errors_ee_1.TestRunError('SET_METRICS_NODE_NOT_CONFIGURED', {
				node_name: unconfiguredMetricsNode.name,
			});
		}
	}
	validateSetOutputsNodes(workflow) {
		const setOutputsNodes = TestRunnerService_1.getEvaluationSetOutputsNodes(workflow);
		if (setOutputsNodes.length === 0) {
			return;
		}
		const unconfiguredSetOutputsNode = setOutputsNodes.find(
			(node) =>
				!node.parameters ||
				!node.parameters.outputs ||
				node.parameters.outputs.assignments?.length === 0 ||
				node.parameters.outputs.assignments?.some(
					(assignment) => !assignment.name || assignment.value === null,
				),
		);
		if (unconfiguredSetOutputsNode) {
			throw new errors_ee_1.TestRunError('SET_OUTPUTS_NODE_NOT_CONFIGURED', {
				node_name: unconfiguredSetOutputsNode.name,
			});
		}
	}
	validateWorkflowConfiguration(workflow) {
		this.validateEvaluationTriggerNode(workflow);
		this.validateSetOutputsNodes(workflow);
		this.validateSetMetricsNodes(workflow);
	}
	async runTestCase(workflow, metadata, testCase, abortSignal) {
		if (abortSignal.aborted) {
			return;
		}
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		(0, node_assert_1.default)(triggerNode);
		const pinData = {
			[triggerNode.name]: [testCase],
		};
		const data = {
			executionMode: 'evaluation',
			pinData,
			workflowData: {
				...workflow,
				settings: {
					...workflow.settings,
					saveManualExecutions: true,
					saveDataErrorExecution: 'all',
					saveDataSuccessExecution: 'all',
					saveExecutionProgress: false,
				},
			},
			userId: metadata.userId,
			partialExecutionVersion: 2,
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};
		if (config_1.default.getEnv('executions.mode') === 'queue') {
			data.executionData = {
				resultData: {
					pinData,
					runData: {},
				},
				manualData: {
					userId: metadata.userId,
					partialExecutionVersion: 2,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
			};
		}
		const executionId = await this.workflowRunner.run(data);
		(0, node_assert_1.default)(executionId);
		abortSignal.addEventListener('abort', () => {
			this.activeExecutions.stopExecution(executionId);
		});
		const executionData = await this.activeExecutions.getPostExecutePromise(executionId);
		(0, node_assert_1.default)(executionData);
		return { executionId, executionData };
	}
	async runDatasetTrigger(workflow, metadata) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		if (!triggerNode) {
			throw new errors_ee_1.TestRunError('EVALUATION_TRIGGER_NOT_FOUND');
		}
		triggerNode.forceCustomOperation = {
			resource: 'dataset',
			operation: 'getRows',
		};
		const data = {
			destinationNode: triggerNode.name,
			executionMode: 'manual',
			runData: {},
			workflowData: {
				...workflow,
				settings: {
					...workflow.settings,
					saveManualExecutions: false,
					saveDataErrorExecution: 'none',
					saveDataSuccessExecution: 'none',
					saveExecutionProgress: false,
				},
			},
			userId: metadata.userId,
			partialExecutionVersion: 2,
			executionData: {
				startData: {
					destinationNode: triggerNode.name,
				},
				resultData: {
					runData: {},
				},
				manualData: {
					userId: metadata.userId,
					partialExecutionVersion: 2,
					triggerToStartFrom: {
						name: triggerNode.name,
					},
				},
			},
			triggerToStartFrom: {
				name: triggerNode.name,
			},
		};
		if (
			!(
				config_1.default.get('executions.mode') === 'queue' &&
				process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true'
			) &&
			data.executionData
		) {
			const nodeExecutionStack = [];
			nodeExecutionStack.push({
				node: triggerNode,
				data: {
					main: [[{ json: {} }]],
				},
				source: null,
			});
			data.executionData.executionData = {
				contextData: {},
				metadata: {},
				nodeExecutionStack,
				waitingExecution: {},
				waitingExecutionSource: {},
			};
		}
		const executionId = await this.workflowRunner.run(data);
		(0, node_assert_1.default)(executionId);
		const executePromise = this.activeExecutions.getPostExecutePromise(executionId);
		return await executePromise;
	}
	static getEvaluationNodes(
		workflow,
		operation,
		{ isDefaultOperation } = { isDefaultOperation: false },
	) {
		return workflow.nodes.filter(
			(node) =>
				node.type === n8n_workflow_1.EVALUATION_NODE_TYPE &&
				node.disabled !== true &&
				(node.parameters.operation === operation ||
					(isDefaultOperation && node.parameters.operation === undefined)),
		);
	}
	static getEvaluationMetricsNodes(workflow) {
		return this.getEvaluationNodes(workflow, 'setMetrics');
	}
	static getEvaluationSetOutputsNodes(workflow) {
		return this.getEvaluationNodes(workflow, 'setOutputs', { isDefaultOperation: true });
	}
	extractDatasetTriggerOutput(execution, workflow) {
		const triggerNode = this.findEvaluationTriggerNode(workflow);
		(0, node_assert_1.default)(triggerNode);
		const triggerOutputData = execution.data.resultData.runData[triggerNode.name][0];
		if (triggerOutputData?.error) {
			throw new errors_ee_1.TestRunError('CANT_FETCH_TEST_CASES', {
				message: triggerOutputData.error.message,
			});
		}
		const triggerOutput = triggerOutputData?.data?.[n8n_workflow_1.NodeConnectionTypes.Main]?.[0];
		if (!triggerOutput || triggerOutput.length === 0) {
			throw new errors_ee_1.TestRunError('TEST_CASES_NOT_FOUND');
		}
		return triggerOutput;
	}
	getEvaluationData(execution, workflow, operation) {
		const evalNodes = TestRunnerService_1.getEvaluationNodes(workflow, operation);
		return evalNodes.reduce((accu, node) => {
			const runs = execution.data.resultData.runData[node.name];
			const data =
				runs?.[0]?.data?.[n8n_workflow_1.NodeConnectionTypes.Main]?.[0]?.[0]?.evaluationData ?? {};
			Object.assign(accu, data);
			return accu;
		}, {});
	}
	extractUserDefinedMetrics(execution, workflow) {
		const metricsNodes = TestRunnerService_1.getEvaluationMetricsNodes(workflow);
		const metricsRunData = metricsNodes
			.flatMap((node) => execution.data.resultData.runData[node.name])
			.filter((data) => data !== undefined);
		const metricsData = metricsRunData
			.reverse()
			.map((data) => data.data?.main?.[0]?.[0]?.json ?? {});
		const metricsResult = metricsData.reduce((acc, curr) => ({ ...acc, ...curr }), {});
		return metricsResult;
	}
	extractPredefinedMetrics(execution) {
		const metricValues = {};
		const tokenUsageMetrics = (0, utils_ee_1.extractTokenUsage)(execution.data.resultData.runData);
		Object.assign(metricValues, tokenUsageMetrics.total);
		if (execution.startedAt && execution.stoppedAt) {
			metricValues.executionTime = execution.stoppedAt.getTime() - execution.startedAt.getTime();
		}
		return metricValues;
	}
	async runTest(user, workflowId) {
		this.logger.debug('Starting new test run', { workflowId });
		const workflow = await this.workflowRepository.findById(workflowId);
		(0, node_assert_1.default)(workflow, 'Workflow not found');
		const testRun = await this.testRunRepository.createTestRun(workflowId);
		(0, node_assert_1.default)(testRun, 'Unable to create a test run');
		const telemetryMeta = {
			workflow_id: workflowId,
			test_type: 'evaluation',
			run_id: testRun.id,
			start: Date.now(),
			status: 'success',
			test_case_count: 0,
			errored_test_case_count: 0,
			metric_count: 0,
			error_message: '',
			duration: 0,
		};
		const abortController = new AbortController();
		this.abortControllers.set(testRun.id, abortController);
		const testRunMetadata = {
			testRunId: testRun.id,
			userId: user.id,
		};
		const abortSignal = abortController.signal;
		const { manager: dbManager } = this.testRunRepository;
		try {
			await this.testRunRepository.markAsRunning(testRun.id);
			this.validateWorkflowConfiguration(workflow);
			this.telemetry.track('User ran test', {
				user_id: user.id,
				run_id: testRun.id,
				workflow_id: workflowId,
			});
			const datasetFetchExecution = await this.runDatasetTrigger(workflow, testRunMetadata);
			(0, node_assert_1.default)(datasetFetchExecution);
			const datasetTriggerOutput = this.extractDatasetTriggerOutput(
				datasetFetchExecution,
				workflow,
			);
			const testCases = datasetTriggerOutput.map((items) => ({ json: items.json }));
			telemetryMeta.test_case_count = testCases.length;
			this.logger.debug('Found test cases', { count: testCases.length });
			const metrics = new evaluation_metrics_ee_1.EvaluationMetrics();
			for (const testCase of testCases) {
				if (abortSignal.aborted) {
					telemetryMeta.status = 'cancelled';
					this.logger.debug('Test run was cancelled', {
						workflowId,
					});
					break;
				}
				this.logger.debug('Running test case');
				const runAt = new Date();
				try {
					const testCaseMetadata = {
						...testRunMetadata,
					};
					const testCaseResult = await this.runTestCase(
						workflow,
						testCaseMetadata,
						testCase,
						abortSignal,
					);
					(0, node_assert_1.default)(testCaseResult);
					const { executionId: testCaseExecutionId, executionData: testCaseExecution } =
						testCaseResult;
					(0, node_assert_1.default)(testCaseExecution);
					(0, node_assert_1.default)(testCaseExecutionId);
					this.logger.debug('Test case execution finished');
					if (!testCaseExecution || testCaseExecution.data.resultData.error) {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							executionId: testCaseExecutionId,
							testRun: {
								id: testRun.id,
							},
							status: 'error',
							errorCode: 'FAILED_TO_EXECUTE_WORKFLOW',
							metrics: {},
						});
						telemetryMeta.errored_test_case_count++;
						continue;
					}
					const completedAt = new Date();
					const { addedMetrics: addedPredefinedMetrics } = metrics.addResults(
						this.extractPredefinedMetrics(testCaseExecution),
					);
					this.logger.debug('Test case common metrics extracted', addedPredefinedMetrics);
					const { addedMetrics: addedUserDefinedMetrics } = metrics.addResults(
						this.extractUserDefinedMetrics(testCaseExecution, workflow),
					);
					if (Object.keys(addedUserDefinedMetrics).length === 0) {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							executionId: testCaseExecutionId,
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'error',
							errorCode: 'NO_METRICS_COLLECTED',
						});
						telemetryMeta.errored_test_case_count++;
					} else {
						const combinedMetrics = {
							...addedUserDefinedMetrics,
							...addedPredefinedMetrics,
						};
						const inputs = this.getEvaluationData(testCaseExecution, workflow, 'setInputs');
						const outputs = this.getEvaluationData(testCaseExecution, workflow, 'setOutputs');
						this.logger.debug(
							'Test case metrics extracted (user-defined)',
							addedUserDefinedMetrics,
						);
						await this.testCaseExecutionRepository.createTestCaseExecution({
							executionId: testCaseExecutionId,
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'success',
							metrics: combinedMetrics,
							inputs,
							outputs,
						});
					}
				} catch (e) {
					const completedAt = new Date();
					this.logger.error('Test case execution failed', {
						workflowId,
						testRunId: testRun.id,
						error: e,
					});
					telemetryMeta.errored_test_case_count++;
					if (e instanceof errors_ee_1.TestCaseExecutionError) {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'error',
							errorCode: e.code,
							errorDetails: e.extra,
						});
					} else {
						await this.testCaseExecutionRepository.createTestCaseExecution({
							testRun: {
								id: testRun.id,
							},
							runAt,
							completedAt,
							status: 'error',
							errorCode: 'UNKNOWN_ERROR',
						});
						this.errorReporter.error(e);
					}
				}
			}
			if (abortSignal.aborted) {
				await dbManager.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);
				});
				telemetryMeta.status = 'cancelled';
			} else {
				const aggregatedMetrics = metrics.getAggregatedMetrics();
				telemetryMeta.metric_count = Object.keys(aggregatedMetrics).length;
				this.logger.debug('Aggregated metrics', aggregatedMetrics);
				await this.testRunRepository.markAsCompleted(testRun.id, aggregatedMetrics);
				this.logger.debug('Test run finished', { workflowId, testRunId: testRun.id });
			}
		} catch (e) {
			telemetryMeta.status = 'fail';
			if (e instanceof n8n_workflow_1.ExecutionCancelledError) {
				this.logger.debug('Evaluation execution was cancelled. Cancelling test run', {
					testRunId: testRun.id,
					stoppedOn: e.extra?.executionId,
				});
				await dbManager.transaction(async (trx) => {
					await this.testRunRepository.markAsCancelled(testRun.id, trx);
					await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRun.id, trx);
				});
				telemetryMeta.status = 'cancelled';
			} else if (e instanceof errors_ee_1.TestRunError) {
				await this.testRunRepository.markAsError(testRun.id, e.code, e.extra);
				telemetryMeta.error_message = e.code;
				if (e.extra && typeof e.extra === 'object' && 'message' in e.extra) {
					telemetryMeta.error_message += `: ${String(e.extra.message)}`;
				}
			} else {
				await this.testRunRepository.markAsError(testRun.id, 'UNKNOWN_ERROR');
				telemetryMeta.error_message = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
				throw e;
			}
		} finally {
			telemetryMeta.duration = Date.now() - telemetryMeta.start;
			this.abortControllers.delete(testRun.id);
			const telemetryPayload = {
				...telemetryMeta,
			};
			if (telemetryMeta.status === 'success') {
				telemetryPayload.test_case_count = telemetryMeta.test_case_count;
				telemetryPayload.errored_test_case_count = telemetryMeta.errored_test_case_count;
				telemetryPayload.metric_count = telemetryMeta.metric_count;
			}
			if (telemetryMeta.status === 'fail') {
				telemetryPayload.error_message = telemetryMeta.error_message;
			}
			this.telemetry.track('Test run finished', telemetryPayload);
		}
	}
	canBeCancelled(testRun) {
		return testRun.status !== 'running' && testRun.status !== 'new';
	}
	async cancelTestRun(testRunId) {
		const abortController = this.abortControllers.get(testRunId);
		if (abortController) {
			abortController.abort();
			this.abortControllers.delete(testRunId);
		} else {
			const { manager: dbManager } = this.testRunRepository;
			await dbManager.transaction(async (trx) => {
				await this.testRunRepository.markAsCancelled(testRunId, trx);
				await this.testCaseExecutionRepository.markAllPendingAsCancelled(testRunId, trx);
			});
		}
	}
});
exports.TestRunnerService = TestRunnerService;
exports.TestRunnerService =
	TestRunnerService =
	TestRunnerService_1 =
		__decorate(
			[
				(0, di_1.Service)(),
				__metadata('design:paramtypes', [
					backend_common_1.Logger,
					telemetry_1.Telemetry,
					db_1.WorkflowRepository,
					workflow_runner_1.WorkflowRunner,
					active_executions_1.ActiveExecutions,
					db_1.TestRunRepository,
					db_1.TestCaseExecutionRepository,
					n8n_core_1.ErrorReporter,
				]),
			],
			TestRunnerService,
		);
//# sourceMappingURL=test-runner.service.ee.js.map
