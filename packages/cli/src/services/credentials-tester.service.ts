/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Service } from 'typedi';
import { NodeExecuteFunctions } from 'n8n-core';
import get from 'lodash/get';

import type {
	ICredentialsDecrypted,
	ICredentialTestFunction,
	ICredentialTestRequestData,
	INode,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	IVersionedNodeType,
	IRunExecutionData,
	WorkflowExecuteMode,
	ITaskDataConnections,
	INodeTypeData,
	INodeTypes,
	ICredentialTestFunctions,
	IDataObject,
} from 'n8n-workflow';
import {
	VersionedNodeType,
	NodeHelpers,
	RoutingNode,
	Workflow,
	ErrorReporterProxy as ErrorReporter,
	ApplicationError,
} from 'n8n-workflow';

import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import type { User } from '@db/entities/User';
import { NodeTypes } from '@/NodeTypes';
import { CredentialTypes } from '@/CredentialTypes';
import { RESPONSE_ERROR_MESSAGES } from '../constants';
import { isObjectLiteral } from '../utils';
import { Logger } from '@/Logger';
import { CredentialsHelper } from '../CredentialsHelper';

const { OAUTH2_CREDENTIAL_TEST_SUCCEEDED, OAUTH2_CREDENTIAL_TEST_FAILED } = RESPONSE_ERROR_MESSAGES;

const mockNodesData: INodeTypeData = {
	mock: {
		sourcePath: '',
		type: {
			description: { properties: [] as INodeProperties[] },
		} as INodeType,
	},
};

const mockNodeTypes: INodeTypes = {
	getKnownTypes(): IDataObject {
		return {};
	},
	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return mockNodesData[nodeType]?.type;
	},
	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		if (!mockNodesData[nodeType]) {
			throw new ApplicationError(RESPONSE_ERROR_MESSAGES.NO_NODE, {
				tags: { nodeType },
			});
		}
		return NodeHelpers.getVersionedNodeType(mockNodesData[nodeType].type, version);
	},
};

@Service()
export class CredentialsTester {
	constructor(
		private readonly logger: Logger,
		private readonly credentialTypes: CredentialTypes,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsHelper: CredentialsHelper,
	) {}

	private static hasAccessToken(credentialsDecrypted: ICredentialsDecrypted) {
		const oauthTokenData = credentialsDecrypted?.data?.oauthTokenData;

		if (!isObjectLiteral(oauthTokenData)) return false;

		return 'access_token' in oauthTokenData;
	}

	getCredentialTestFunction(
		credentialType: string,
	): ICredentialTestFunction | ICredentialTestRequestData | undefined {
		// Check if test is defined on credentials
		const type = this.credentialTypes.getByName(credentialType);
		if (type.test) {
			return {
				testRequest: type.test,
			};
		}

		const supportedNodes = this.credentialTypes.getSupportedNodes(credentialType);
		for (const nodeName of supportedNodes) {
			const node = this.nodeTypes.getByName(nodeName);

			// Always set to an array even if node is not versioned to not having
			// to duplicate the logic
			const allNodeTypes: INodeType[] = [];
			if (node instanceof VersionedNodeType) {
				// Node is versioned
				allNodeTypes.push(...Object.values(node.nodeVersions));
			} else {
				// Node is not versioned
				allNodeTypes.push(node as INodeType);
			}

			// Check each of the node versions for credential tests
			for (const nodeType of allNodeTypes) {
				// Check each of teh credentials
				for (const { name, testedBy } of nodeType.description.credentials ?? []) {
					if (
						name === credentialType &&
						(this.credentialTypes.getParentTypes(name).includes('oAuth2Api') ||
							name === 'oAuth2Api')
					) {
						return async function oauth2CredTest(
							this: ICredentialTestFunctions,
							cred: ICredentialsDecrypted,
						): Promise<INodeCredentialTestResult> {
							return CredentialsTester.hasAccessToken(cred)
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
							if (node instanceof VersionedNodeType) {
								// The node is versioned. So check all versions for test function
								// starting with the latest
								const versions = Object.keys(node.nodeVersions).sort().reverse();
								for (const version of versions) {
									const versionedNode = node.nodeVersions[parseInt(version, 10)];
									const credentialTest = versionedNode.methods?.credentialTest;
									if (credentialTest && testedBy in credentialTest) {
										return credentialTest[testedBy];
									}
								}
							}
							// Test is defined as string which links to a function
							return (node as unknown as INodeType).methods?.credentialTest![testedBy];
						}

						// Test is defined as JSON with a definition for the request to make
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

	// eslint-disable-next-line complexity
	async testCredentials(
		user: User,
		credentialType: string,
		credentialsDecrypted: ICredentialsDecrypted,
	): Promise<INodeCredentialTestResult> {
		const credentialTestFunction = this.getCredentialTestFunction(credentialType);
		if (credentialTestFunction === undefined) {
			return {
				status: 'Error',
				message: 'No testing function found for this credential.',
			};
		}

		if (credentialsDecrypted.data) {
			try {
				const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);
				credentialsDecrypted.data = this.credentialsHelper.applyDefaultsAndOverwrites(
					additionalData,
					credentialsDecrypted.data,
					credentialType,
					'internal' as WorkflowExecuteMode,
					undefined,
					undefined,
					user.hasGlobalScope('externalSecret:use'),
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
			// The credentials get tested via a function that is defined on the node
			const credentialTestFunctions = NodeExecuteFunctions.getCredentialTestFunctions();

			return credentialTestFunction.call(credentialTestFunctions, credentialsDecrypted);
		}

		// Credentials get tested via request instructions

		// TODO: Temp workflows get created at multiple locations (for example also LoadNodeParameterOptions),
		//       check if some of them are identical enough that it can be combined

		let nodeType: INodeType;
		if (credentialTestFunction.nodeType) {
			nodeType = credentialTestFunction.nodeType;
		} else {
			nodeType = this.nodeTypes.getByNameAndVersion('n8n-nodes-base.noOp');
		}

		const node: INode = {
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

		const nodeTypeCopy: INodeType = {
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

		const workflow = new Workflow({
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: mockNodeTypes,
		});

		const mode = 'internal';
		const runIndex = 0;
		const inputData: ITaskDataConnections = {
			main: [[{ json: {} }]],
		};
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};

		const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id, node.parameters);

		const routingNode = new RoutingNode(
			workflow,
			node,
			connectionInputData,
			runExecutionData ?? null,
			additionalData,
			mode,
		);

		let response: INodeExecutionData[][] | null | undefined;

		try {
			response = await routingNode.runNode(
				inputData,
				runIndex,
				nodeTypeCopy,
				{ node, data: {}, source: null },
				NodeExecuteFunctions,
				credentialsDecrypted,
			);
		} catch (error) {
			ErrorReporter.error(error);
			// Do not fail any requests to allow custom error messages and
			// make logic easier
			if (error.cause?.response) {
				const errorResponseData = {
					statusCode: error.cause.response.status,
					statusMessage: error.cause.response.statusText,
				};
				if (credentialTestFunction.testRequest.rules) {
					// Special testing rules are defined so check all in order
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
					// All requests with response codes that are not 2xx are treated by default as failed
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
			// Special testing rules are defined so check all in order
			for (const rule of credentialTestFunction.testRequest.rules) {
				if (rule.type === 'responseSuccessBody') {
					const responseData = response![0][0].json;
					if (get(responseData, rule.properties.key) === rule.properties.value) {
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
}
