'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowExecutionService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const config_2 = __importDefault(require('@/config'));
const execution_data_service_1 = require('@/executions/execution-data.service');
const pre_execution_checks_1 = require('@/executions/pre-execution-checks');
const node_types_1 = require('@/node-types');
const test_webhooks_1 = require('@/webhooks/test-webhooks');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_runner_1 = require('@/workflow-runner');
let WorkflowExecutionService = class WorkflowExecutionService {
	constructor(
		logger,
		errorReporter,
		executionRepository,
		workflowRepository,
		nodeTypes,
		testWebhooks,
		workflowRunner,
		globalConfig,
		subworkflowPolicyChecker,
		executionDataService,
	) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.executionRepository = executionRepository;
		this.workflowRepository = workflowRepository;
		this.nodeTypes = nodeTypes;
		this.testWebhooks = testWebhooks;
		this.workflowRunner = workflowRunner;
		this.globalConfig = globalConfig;
		this.subworkflowPolicyChecker = subworkflowPolicyChecker;
		this.executionDataService = executionDataService;
	}
	async runWorkflow(workflowData, node, data, additionalData, mode, responsePromise) {
		const nodeExecutionStack = [
			{
				node,
				data: {
					main: data,
				},
				source: null,
			},
		];
		const executionData = {
			startData: {},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack,
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};
		const runData = {
			userId: additionalData.userId,
			executionMode: mode,
			executionData,
			workflowData,
		};
		return await this.workflowRunner.run(runData, true, undefined, undefined, responsePromise);
	}
	isDestinationNodeATrigger(destinationNode, workflow) {
		const node = workflow.nodes.find((n) => n.name === destinationNode);
		if (node === undefined) {
			return false;
		}
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		return nodeType.description.group.includes('trigger');
	}
	async executeManually(
		{
			workflowData,
			runData,
			startNodes,
			destinationNode,
			dirtyNodeNames,
			triggerToStartFrom,
			agentRequest,
		},
		user,
		pushRef,
		partialExecutionVersion = 1,
	) {
		const pinData = workflowData.pinData;
		let pinnedTrigger = this.selectPinnedActivatorStarter(
			workflowData,
			startNodes?.map((nodeData) => nodeData.name),
			pinData,
			destinationNode,
		);
		if (destinationNode) {
			if (this.isDestinationNodeATrigger(destinationNode, workflowData)) {
				runData = undefined;
			}
		}
		if (pinnedTrigger && triggerToStartFrom && pinnedTrigger.name !== triggerToStartFrom.name) {
			pinnedTrigger = null;
		}
		if (
			pinnedTrigger === null &&
			(runData === undefined ||
				startNodes === undefined ||
				startNodes.length === 0 ||
				destinationNode === undefined)
		) {
			const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);
			const needsWebhook = await this.testWebhooks.needsWebhook({
				userId: user.id,
				workflowEntity: workflowData,
				additionalData,
				runData,
				pushRef,
				destinationNode,
				triggerToStartFrom,
			});
			if (needsWebhook) return { waitingForWebhook: true };
		}
		workflowData.active = false;
		const data = {
			destinationNode,
			executionMode: 'manual',
			runData,
			pinData,
			pushRef,
			startNodes,
			workflowData,
			userId: user.id,
			partialExecutionVersion,
			dirtyNodeNames,
			triggerToStartFrom,
			agentRequest,
		};
		const hasRunData = (node) => runData !== undefined && !!runData[node.name];
		if (pinnedTrigger && !hasRunData(pinnedTrigger)) {
			data.startNodes = [{ name: pinnedTrigger.name, sourceData: null }];
		}
		if (
			config_2.default.getEnv('executions.mode') === 'queue' &&
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true'
		) {
			data.executionData = {
				startData: {
					startNodes: data.startNodes,
					destinationNode,
				},
				resultData: {
					pinData,
					runData,
				},
				manualData: {
					userId: data.userId,
					partialExecutionVersion: data.partialExecutionVersion,
					dirtyNodeNames,
					triggerToStartFrom,
				},
			};
		}
		const executionId = await this.workflowRunner.run(data);
		return {
			executionId,
		};
	}
	async executeErrorWorkflow(workflowId, workflowErrorData, runningProject) {
		try {
			const workflowData = await this.workflowRepository.findOneBy({ id: workflowId });
			if (workflowData === null) {
				this.logger.error(
					`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find error workflow "${workflowId}"`,
					{ workflowId },
				);
				return;
			}
			const executionMode = 'error';
			const workflowInstance = new n8n_workflow_1.Workflow({
				id: workflowId,
				name: workflowData.name,
				nodeTypes: this.nodeTypes,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: workflowData.active,
				staticData: workflowData.staticData,
				settings: workflowData.settings,
			});
			try {
				const failedNode = workflowErrorData.execution?.lastNodeExecuted
					? workflowInstance.getNode(workflowErrorData.execution?.lastNodeExecuted)
					: undefined;
				await this.subworkflowPolicyChecker.check(
					workflowInstance,
					workflowErrorData.workflow.id,
					failedNode ?? undefined,
				);
			} catch (error) {
				const initialNode = workflowInstance.getStartNode();
				if (initialNode) {
					const errorWorkflowPermissionError = new n8n_workflow_1.SubworkflowOperationError(
						`Another workflow: (ID ${workflowErrorData.workflow.id}) tried to invoke this workflow to handle errors.`,
						"Unfortunately current permissions do not allow this. Please check that this workflow's settings allow it to be called by others",
					);
					const fakeExecution = this.executionDataService.generateFailedExecutionFromError(
						'error',
						errorWorkflowPermissionError,
						initialNode,
					);
					const fullExecutionData = {
						data: fakeExecution.data,
						mode: fakeExecution.mode,
						finished: false,
						stoppedAt: new Date(),
						workflowData,
						waitTill: null,
						status: fakeExecution.status,
						workflowId: workflowData.id,
					};
					await this.executionRepository.createNewExecution(fullExecutionData);
				}
				this.logger.info('Error workflow execution blocked due to subworkflow settings', {
					erroredWorkflowId: workflowErrorData.workflow.id,
					errorWorkflowId: workflowId,
				});
				return;
			}
			let node;
			let workflowStartNode;
			const { errorTriggerType } = this.globalConfig.nodes;
			for (const nodeName of Object.keys(workflowInstance.nodes)) {
				node = workflowInstance.nodes[nodeName];
				if (node.type === errorTriggerType) {
					workflowStartNode = node;
				}
			}
			if (workflowStartNode === undefined) {
				this.logger.error(
					`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${errorTriggerType}" in workflow "${workflowId}"`,
				);
				return;
			}
			const parentExecution =
				workflowErrorData.execution?.id && workflowErrorData.workflow?.id
					? {
							executionId: workflowErrorData.execution.id,
							workflowId: workflowErrorData.workflow.id,
						}
					: undefined;
			const nodeExecutionStack = [];
			nodeExecutionStack.push({
				node: workflowStartNode,
				data: {
					main: [
						[
							{
								json: workflowErrorData,
							},
						],
					],
				},
				source: null,
				...(parentExecution && {
					metadata: {
						parentExecution,
					},
				}),
			});
			const runExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack,
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};
			const runData = {
				executionMode,
				executionData: runExecutionData,
				workflowData,
				projectId: runningProject.id,
			};
			await this.workflowRunner.run(runData);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				`Calling Error Workflow for "${workflowErrorData.workflow.id}": "${error instanceof Error ? error.message : String(error)}"`,
				{ workflowId: workflowErrorData.workflow.id },
			);
		}
	}
	selectPinnedActivatorStarter(workflow, startNodes, pinData, destinationNode) {
		if (!pinData || !startNodes) return null;
		const allPinnedActivators = this.findAllPinnedActivators(workflow, pinData);
		if (allPinnedActivators.length === 0) return null;
		const [firstPinnedActivator] = allPinnedActivators;
		if (startNodes?.length === 0) {
			if (destinationNode) {
				const destinationParents = new Set(
					new n8n_workflow_1.Workflow({
						nodes: workflow.nodes,
						connections: workflow.connections,
						active: workflow.active,
						nodeTypes: this.nodeTypes,
					}).getParentNodes(destinationNode),
				);
				const activator = allPinnedActivators.find((a) => destinationParents.has(a.name));
				if (activator) {
					return activator;
				}
			}
			return firstPinnedActivator ?? null;
		}
		const [firstStartNodeName] = startNodes;
		const parentNodeNames = new n8n_workflow_1.Workflow({
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: workflow.active,
			nodeTypes: this.nodeTypes,
		}).getParentNodes(firstStartNodeName);
		if (parentNodeNames.length > 0) {
			const parentNodeName = parentNodeNames.find((p) => p === firstPinnedActivator.name);
			return allPinnedActivators.find((pa) => pa.name === parentNodeName) ?? null;
		}
		return allPinnedActivators.find((pa) => pa.name === firstStartNodeName) ?? null;
	}
	findAllPinnedActivators(workflow, pinData) {
		return workflow.nodes
			.filter(
				(node) =>
					!node.disabled &&
					pinData?.[node.name] &&
					['trigger', 'webhook'].some((suffix) => node.type.toLowerCase().endsWith(suffix)) &&
					node.type !== 'n8n-nodes-base.respondToWebhook',
			)
			.sort((a) => (a.type.endsWith('webhook') ? -1 : 1));
	}
};
exports.WorkflowExecutionService = WorkflowExecutionService;
exports.WorkflowExecutionService = WorkflowExecutionService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			db_1.ExecutionRepository,
			db_1.WorkflowRepository,
			node_types_1.NodeTypes,
			test_webhooks_1.TestWebhooks,
			workflow_runner_1.WorkflowRunner,
			config_1.GlobalConfig,
			pre_execution_checks_1.SubworkflowPolicyChecker,
			execution_data_service_1.ExecutionDataService,
		]),
	],
	WorkflowExecutionService,
);
//# sourceMappingURL=workflow-execution.service.js.map
