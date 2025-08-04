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
Object.defineProperty(exports, '__esModule', { value: true });
exports.DynamicNodeParametersService = void 0;
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_types_1 = require('@/node-types');
const workflow_loader_service_1 = require('./workflow-loader.service');
let DynamicNodeParametersService = class DynamicNodeParametersService {
	constructor(nodeTypes, workflowLoaderService) {
		this.nodeTypes = nodeTypes;
		this.workflowLoaderService = workflowLoaderService;
	}
	async getOptionsViaMethodName(
		methodName,
		path,
		additionalData,
		nodeTypeAndVersion,
		currentNodeParameters,
		credentials,
	) {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('loadOptions', methodName, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		return method.call(thisArgs);
	}
	async getOptionsViaLoadOptions(
		loadOptions,
		additionalData,
		nodeTypeAndVersion,
		currentNodeParameters,
		credentials,
	) {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		if (!nodeType.description.requestDefaults?.baseURL) {
			throw new n8n_workflow_1.UnexpectedError(
				'Node type does not exist or does not have "requestDefaults.baseURL" defined!',
				{ tags: { nodeType: nodeType.description.name } },
			);
		}
		const mode = 'internal';
		const runIndex = 0;
		const connectionInputData = [];
		const runExecutionData = { resultData: { runData: {} } };
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const node = workflow.nodes['Temp-Node'];
		const tempNodeType = {
			...nodeType,
			...{
				description: {
					...nodeType.description,
					properties: [
						{
							displayName: '',
							type: 'string',
							name: '',
							default: '',
							routing: loadOptions.routing,
						},
					],
				},
			},
		};
		const inputData = {
			main: [[{ json: {} }]],
		};
		const executeData = {
			node,
			source: null,
			data: {},
		};
		const executeFunctions = new n8n_core_1.ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
			[],
		);
		const routingNode = new n8n_core_1.RoutingNode(executeFunctions, tempNodeType);
		const optionsData = await routingNode.runNode();
		if (optionsData?.length === 0) {
			return [];
		}
		if (!Array.isArray(optionsData)) {
			throw new n8n_workflow_1.UnexpectedError('The returned data is not an array');
		}
		return optionsData[0].map((item) => item.json);
	}
	async getResourceLocatorResults(
		methodName,
		path,
		additionalData,
		nodeTypeAndVersion,
		currentNodeParameters,
		credentials,
		filter,
		paginationToken,
	) {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('listSearch', methodName, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		return method.call(thisArgs, filter, paginationToken);
	}
	async getResourceMappingFields(
		methodName,
		path,
		additionalData,
		nodeTypeAndVersion,
		currentNodeParameters,
		credentials,
	) {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('resourceMapping', methodName, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		return method.call(thisArgs);
	}
	async getLocalResourceMappingFields(methodName, path, additionalData, nodeTypeAndVersion) {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('localResourceMapping', methodName, nodeType);
		const thisArgs = this.getLocalLoadOptionsContext(path, additionalData);
		return method.call(thisArgs);
	}
	async getActionResult(
		handler,
		path,
		additionalData,
		nodeTypeAndVersion,
		currentNodeParameters,
		payload,
		credentials,
	) {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('actionHandler', handler, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		return method.call(thisArgs, payload);
	}
	getMethod(type, methodName, nodeType) {
		const method = nodeType.methods?.[type]?.[methodName];
		if (typeof method !== 'function') {
			throw new n8n_workflow_1.UnexpectedError('Node type does not have method defined', {
				tags: { nodeType: nodeType.description.name },
				extra: { methodName },
			});
		}
		return method;
	}
	getNodeType({ name, version }) {
		return this.nodeTypes.getByNameAndVersion(name, version);
	}
	getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials) {
		const node = {
			parameters: currentNodeParameters,
			id: 'uuid-1234',
			name: 'Temp-Node',
			type: nodeTypeAndVersion.name,
			typeVersion: nodeTypeAndVersion.version,
			position: [0, 0],
		};
		if (credentials) {
			node.credentials = credentials;
		}
		return new n8n_workflow_1.Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});
	}
	getThisArg(path, additionalData, workflow) {
		const node = workflow.nodes['Temp-Node'];
		return new n8n_core_1.LoadOptionsContext(workflow, node, additionalData, path);
	}
	getLocalLoadOptionsContext(path, additionalData) {
		return new n8n_core_1.LocalLoadOptionsContext(
			this.nodeTypes,
			additionalData,
			path,
			this.workflowLoaderService,
		);
	}
};
exports.DynamicNodeParametersService = DynamicNodeParametersService;
exports.DynamicNodeParametersService = DynamicNodeParametersService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			node_types_1.NodeTypes,
			workflow_loader_service_1.WorkflowLoaderService,
		]),
	],
	DynamicNodeParametersService,
);
//# sourceMappingURL=dynamic-node-parameters.service.js.map
