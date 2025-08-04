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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ManualExecutionService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const a = __importStar(require('assert/strict'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
let ManualExecutionService = class ManualExecutionService {
	constructor(logger) {
		this.logger = logger;
	}
	getExecutionStartNode(data, workflow) {
		let startNode;
		if (data.triggerToStartFrom?.name) {
			startNode = workflow.getNode(data.triggerToStartFrom.name) ?? undefined;
		}
		if (
			data.startNodes?.length === 1 &&
			Object.keys(data.pinData ?? {}).includes(data.startNodes[0].name)
		) {
			startNode = workflow.getNode(data.startNodes[0].name) ?? undefined;
		}
		return startNode;
	}
	async runManually(data, workflow, additionalData, executionId, pinData) {
		if (data.triggerToStartFrom?.data && data.startNodes?.length) {
			this.logger.debug(
				`Execution ID ${executionId} had triggerToStartFrom. Starting from that trigger.`,
				{ executionId },
			);
			const startNodes = data.startNodes.map((startNode) => {
				const node = workflow.getNode(startNode.name);
				a.ok(node, `Could not find a node named "${startNode.name}" in the workflow.`);
				return node;
			});
			const runData = { [data.triggerToStartFrom.name]: [data.triggerToStartFrom.data] };
			let nodeExecutionStack = [];
			let waitingExecution = {};
			let waitingExecutionSource = {};
			if (data.destinationNode !== data.triggerToStartFrom.name) {
				const recreatedStack = (0, n8n_core_1.recreateNodeExecutionStack)(
					(0, n8n_core_1.filterDisabledNodes)(n8n_core_1.DirectedGraph.fromWorkflow(workflow)),
					new Set(startNodes),
					runData,
					data.pinData ?? {},
				);
				nodeExecutionStack = recreatedStack.nodeExecutionStack;
				waitingExecution = recreatedStack.waitingExecution;
				waitingExecutionSource = recreatedStack.waitingExecutionSource;
			}
			const executionData = {
				resultData: { runData, pinData },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack,
					waitingExecution,
					waitingExecutionSource,
				},
			};
			if (data.destinationNode) {
				executionData.startData = { destinationNode: data.destinationNode };
			}
			const workflowExecute = new n8n_core_1.WorkflowExecute(
				additionalData,
				data.executionMode,
				executionData,
			);
			return workflowExecute.processRunExecutionData(workflow);
		} else if (
			data.runData === undefined ||
			(data.partialExecutionVersion !== 2 && (!data.startNodes || data.startNodes.length === 0)) ||
			data.executionMode === 'evaluation'
		) {
			this.logger.debug(`Execution ID ${executionId} will run executing all nodes.`, {
				executionId,
			});
			const startNode = this.getExecutionStartNode(data, workflow);
			if (data.destinationNode) {
				const destinationNode = workflow.getNode(data.destinationNode);
				a.ok(
					destinationNode,
					`Could not find a node named "${data.destinationNode}" in the workflow.`,
				);
				const destinationNodeType = workflow.nodeTypes.getByNameAndVersion(
					destinationNode.type,
					destinationNode.typeVersion,
				);
				if (
					n8n_workflow_1.NodeHelpers.isTool(
						destinationNodeType.description,
						destinationNode.parameters,
					)
				) {
					const graph = (0, n8n_core_1.rewireGraph)(
						destinationNode,
						n8n_core_1.DirectedGraph.fromWorkflow(workflow),
						data.agentRequest,
					);
					workflow = graph.toWorkflow({
						...workflow,
					});
					if (data.executionData) {
						data.executionData.startData = data.executionData.startData ?? {};
						data.executionData.startData.originalDestinationNode = data.destinationNode;
					}
					data.destinationNode = constants_1.TOOL_EXECUTOR_NODE_NAME;
				}
			}
			const workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, data.executionMode);
			return workflowExecute.run(
				workflow,
				startNode,
				data.destinationNode,
				data.pinData,
				data.triggerToStartFrom,
			);
		} else {
			this.logger.debug(`Execution ID ${executionId} is a partial execution.`, { executionId });
			const workflowExecute = new n8n_core_1.WorkflowExecute(additionalData, data.executionMode);
			if (data.partialExecutionVersion === 2) {
				return workflowExecute.runPartialWorkflow2(
					workflow,
					data.runData,
					data.pinData,
					data.dirtyNodeNames,
					data.destinationNode,
					data.agentRequest,
				);
			} else {
				return workflowExecute.runPartialWorkflow(
					workflow,
					data.runData,
					data.startNodes ?? [],
					data.destinationNode,
					data.pinData,
				);
			}
		}
	}
};
exports.ManualExecutionService = ManualExecutionService;
exports.ManualExecutionService = ManualExecutionService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	ManualExecutionService,
);
//# sourceMappingURL=manual-execution.service.js.map
