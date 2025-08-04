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
var CredentialsTester_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.CredentialsTester = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const get_1 = __importDefault(require('lodash/get'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const credential_types_1 = require('@/credential-types');
const node_types_1 = require('@/node-types');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const constants_1 = require('../constants');
const credentials_helper_1 = require('../credentials-helper');
const { OAUTH2_CREDENTIAL_TEST_SUCCEEDED, OAUTH2_CREDENTIAL_TEST_FAILED } =
	constants_1.RESPONSE_ERROR_MESSAGES;
const mockNodesData = {
	mock: {
		sourcePath: '',
		type: {
			description: { properties: [] },
		},
	},
};
const mockNodeTypes = {
	getKnownTypes() {
		return {};
	},
	getByName(nodeType) {
		return mockNodesData[nodeType]?.type;
	},
	getByNameAndVersion(nodeType, version) {
		if (!mockNodesData[nodeType]) {
			throw new n8n_workflow_1.UnexpectedError(constants_1.RESPONSE_ERROR_MESSAGES.NO_NODE, {
				tags: { nodeType },
			});
		}
		return n8n_workflow_1.NodeHelpers.getVersionedNodeType(mockNodesData[nodeType].type, version);
	},
};
let CredentialsTester = (CredentialsTester_1 = class CredentialsTester {
	constructor(logger, errorReporter, credentialTypes, nodeTypes, credentialsHelper) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.credentialTypes = credentialTypes;
		this.nodeTypes = nodeTypes;
		this.credentialsHelper = credentialsHelper;
	}
	static hasAccessToken(credentialsDecrypted) {
		const oauthTokenData = credentialsDecrypted?.data?.oauthTokenData;
		if (!(0, backend_common_1.isObjectLiteral)(oauthTokenData)) return false;
		return 'access_token' in oauthTokenData;
	}
	getCredentialTestFunction(credentialType) {
		const type = this.credentialTypes.getByName(credentialType);
		if (type.test) {
			return {
				testRequest: type.test,
			};
		}
		const supportedNodes = this.credentialTypes.getSupportedNodes(credentialType);
		for (const nodeName of supportedNodes) {
			const node = this.nodeTypes.getByName(nodeName);
			const allNodeTypes = [];
			if (node instanceof n8n_workflow_1.VersionedNodeType) {
				allNodeTypes.push(...Object.values(node.nodeVersions));
			} else {
				allNodeTypes.push(node);
			}
			for (const nodeType of allNodeTypes) {
				for (const { name, testedBy } of nodeType.description.credentials ?? []) {
					if (
						name === credentialType &&
						(this.credentialTypes.getParentTypes(name).includes('oAuth2Api') ||
							name === 'oAuth2Api')
					) {
						return async function oauth2CredTest(cred) {
							return CredentialsTester_1.hasAccessToken(cred)
								? {
										status: 'OK',
										message: OAUTH2_CREDENTIAL_TEST_SUCCEEDED,
									}
								: {
										status: 'Error',
										message: OAUTH2_CREDENTIAL_TEST_FAILED,
									};
						};
					}
					if (name === credentialType && !!testedBy) {
						if (typeof testedBy === 'string') {
							if (node instanceof n8n_workflow_1.VersionedNodeType) {
								const versions = Object.keys(node.nodeVersions).sort().reverse();
								for (const version of versions) {
									const versionedNode = node.nodeVersions[parseInt(version, 10)];
									const credentialTest = versionedNode.methods?.credentialTest;
									if (credentialTest && testedBy in credentialTest) {
										return credentialTest[testedBy];
									}
								}
							}
							return node.methods?.credentialTest[testedBy];
						}
						return {
							nodeType,
							testRequest: testedBy,
						};
					}
				}
			}
		}
		return undefined;
	}
	async testCredentials(userId, credentialType, credentialsDecrypted) {
		const credentialTestFunction = this.getCredentialTestFunction(credentialType);
		if (credentialTestFunction === undefined) {
			return {
				status: 'Error',
				message: 'No testing function found for this credential.',
			};
		}
		if (credentialsDecrypted.data) {
			try {
				const additionalData = await WorkflowExecuteAdditionalData.getBase(userId);
				credentialsDecrypted.data = await this.credentialsHelper.applyDefaultsAndOverwrites(
					additionalData,
					credentialsDecrypted.data,
					credentialsDecrypted,
					credentialType,
					'internal',
					undefined,
					undefined,
				);
			} catch (error) {
				this.logger.debug('Credential test failed', error);
				return {
					status: 'Error',
					message: error.message.toString(),
				};
			}
		}
		if (typeof credentialTestFunction === 'function') {
			const context = new n8n_core_1.CredentialTestContext();
			return credentialTestFunction.call(context, credentialsDecrypted);
		}
		let nodeType;
		if (credentialTestFunction.nodeType) {
			nodeType = credentialTestFunction.nodeType;
		} else {
			nodeType = this.nodeTypes.getByNameAndVersion('n8n-nodes-base.noOp');
		}
		const node = {
			id: 'temp',
			parameters: {},
			name: 'Temp-Node',
			type: nodeType.description.name,
			typeVersion: Array.isArray(nodeType.description.version)
				? nodeType.description.version.slice(-1)[0]
				: nodeType.description.version,
			position: [0, 0],
			credentials: {
				[credentialType]: {
					id: credentialsDecrypted.id,
					name: credentialsDecrypted.name,
				},
			},
		};
		const workflowData = {
			nodes: [node],
			connections: {},
		};
		const nodeTypeCopy = {
			description: {
				...nodeType.description,
				credentials: [
					{
						name: credentialType,
						required: true,
					},
				],
				properties: [
					{
						displayName: 'Temp',
						name: 'temp',
						type: 'string',
						routing: {
							request: credentialTestFunction.testRequest.request,
						},
						default: '',
					},
				],
			},
		};
		mockNodesData[nodeTypeCopy.description.name] = {
			sourcePath: '',
			type: nodeTypeCopy,
		};
		const workflow = new n8n_workflow_1.Workflow({
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: mockNodeTypes,
		});
		const mode = 'internal';
		const runIndex = 0;
		const inputData = {
			main: [[{ json: {} }]],
		};
		const connectionInputData = [];
		const runExecutionData = {
			resultData: {
				runData: {},
			},
		};
		const additionalData = await WorkflowExecuteAdditionalData.getBase(userId, node.parameters);
		const executeData = { node, data: {}, source: null };
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
		const routingNode = new n8n_core_1.RoutingNode(
			executeFunctions,
			nodeTypeCopy,
			credentialsDecrypted,
		);
		let response;
		try {
			response = await routingNode.runNode();
		} catch (error) {
			this.errorReporter.error(error);
			if (error.cause?.response) {
				const errorResponseData = {
					statusCode: error.cause.response.status,
					statusMessage: error.cause.response.statusText,
				};
				if (credentialTestFunction.testRequest.rules) {
					for (const rule of credentialTestFunction.testRequest.rules) {
						if (rule.type === 'responseCode') {
							if (errorResponseData.statusCode === rule.properties.value) {
								return {
									status: 'Error',
									message: rule.properties.message,
								};
							}
						}
					}
				}
				if (errorResponseData.statusCode < 199 || errorResponseData.statusCode > 299) {
					return {
						status: 'Error',
						message:
							errorResponseData.statusMessage ||
							`Received HTTP status code: ${errorResponseData.statusCode}`,
					};
				}
			} else if (error.cause?.code) {
				return {
					status: 'Error',
					message: error.cause.code,
				};
			}
			this.logger.debug('Credential test failed', error);
			return {
				status: 'Error',
				message: error.message.toString(),
			};
		} finally {
			delete mockNodesData[nodeTypeCopy.description.name];
		}
		if (
			credentialTestFunction.testRequest.rules &&
			Array.isArray(credentialTestFunction.testRequest.rules)
		) {
			for (const rule of credentialTestFunction.testRequest.rules) {
				if (rule.type === 'responseSuccessBody') {
					const responseData = response[0][0].json;
					if ((0, get_1.default)(responseData, rule.properties.key) === rule.properties.value) {
						return {
							status: 'Error',
							message: rule.properties.message,
						};
					}
				}
			}
		}
		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	}
});
exports.CredentialsTester = CredentialsTester;
exports.CredentialsTester =
	CredentialsTester =
	CredentialsTester_1 =
		__decorate(
			[
				(0, di_1.Service)(),
				__metadata('design:paramtypes', [
					backend_common_1.Logger,
					n8n_core_1.ErrorReporter,
					credential_types_1.CredentialTypes,
					node_types_1.NodeTypes,
					credentials_helper_1.CredentialsHelper,
				]),
			],
			CredentialsTester,
		);
//# sourceMappingURL=credentials-tester.service.js.map
