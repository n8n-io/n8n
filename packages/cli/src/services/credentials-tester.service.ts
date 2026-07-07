/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Logger, isObjectLiteral } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import get from 'lodash/get';
import { CredentialTestContext, ErrorReporter, ExecuteContext, RoutingNode } from 'n8n-core';
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
	WorkflowExecuteMode,
	ITaskDataConnections,
	INodeTypeData,
	INodeTypes,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	VersionedNodeType,
	NodeHelpers,
	Workflow,
	UnexpectedError,
	createEmptyRunExecutionData,
} from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { RESPONSE_ERROR_MESSAGES } from '../constants';
import { getExternalSecretExpressionPaths } from '../credentials/external-secrets.utils';
import { CredentialsHelper } from '../credentials-helper';

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
			throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.NO_NODE, {
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
		private readonly errorReporter: ErrorReporter,
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
				allNodeTypes.push.apply(allNodeTypes, Object.values(node.nodeVersions));
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

	private redactSecrets(
		message: string,
		credentialsData: ICredentialsDecrypted['data'],
		secretPaths: string[],
	): string {
		if (secretPaths.length === 0) {
			return message;
		}
		const updatedSecrets = secretPaths
			.map((path) => get(credentialsData, path))
			.filter((value) => value !== undefined);

		updatedSecrets.forEach((value) => {
			message = message.replaceAll(value.toString(), `*****${value.toString().slice(-3)}`);
		});
		return message;
	}

	/** Resolve overwrites/defaults onto the decrypted data; returns the secret paths for redaction. */
	private async prepareCredentialsForTest(
		userId: User['id'],
		credentialType: string,
		credentialsDecrypted: ICredentialsDecrypted,
	): Promise<{
		baseAdditionalData: IWorkflowExecuteAdditionalData;
		credentialsDataSecretKeys: string[];
	}> {
		const baseAdditionalData = await WorkflowExecuteAdditionalData.getBase({
			userId,
			projectId: credentialsDecrypted.homeProject?.id,
		});

		let credentialsDataSecretKeys: string[] = [];
		if (credentialsDecrypted.data) {
			// Keep all credentials data keys which have a secret value
			credentialsDataSecretKeys = getExternalSecretExpressionPaths(credentialsDecrypted.data);
			credentialsDecrypted.data = await this.credentialsHelper.applyDefaultsAndOverwrites(
				baseAdditionalData,
				credentialsDecrypted.data,
				credentialType,
				'internal' as WorkflowExecuteMode,
				undefined,
				undefined,
			);
		}

		return { baseAdditionalData, credentialsDataSecretKeys };
	}

	/**
	 * Test a credential against an ad-hoc URL when its type declares no test of
	 * its own (generic auth types like httpHeaderAuth). The credential is applied
	 * through its `authenticate` definition — the same way the HTTP Request node
	 * sends it — and only 401/403 count as rejection: any other response means
	 * the endpoint accepted the credential (it may still dislike the method or
	 * path), and an unreachable service is inconclusive rather than a failure.
	 */
	async probeCredentialAuth(
		userId: User['id'],
		credentialType: string,
		credentialsDecrypted: ICredentialsDecrypted,
		targetUrl: string,
		options: { acceptedStatusCodes?: number[] } = {},
	): Promise<INodeCredentialTestResult> {
		try {
			await this.prepareCredentialsForTest(userId, credentialType, credentialsDecrypted);
		} catch (error) {
			this.logger.debug('Credential auth probe failed', error);
			return {
				status: 'Error',
				message: error.message.toString(),
			};
		}

		return await this.runRequestTest(
			userId,
			credentialType,
			credentialsDecrypted,
			{ testRequest: { request: { url: targetUrl, method: 'GET' } } },
			'authProbe',
			options.acceptedStatusCodes,
		);
	}

	async testCredentials(
		userId: User['id'],
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

		let credentialsDataSecretKeys: string[] = [];
		let baseAdditionalData: IWorkflowExecuteAdditionalData;
		try {
			({ baseAdditionalData, credentialsDataSecretKeys } = await this.prepareCredentialsForTest(
				userId,
				credentialType,
				credentialsDecrypted,
			));
		} catch (error) {
			this.logger.debug('Credential test failed', error);
			return {
				status: 'Error',
				message: error.message.toString(),
			};
		}

		if (typeof credentialTestFunction === 'function') {
			// The credentials get tested via a function that is defined on the node.
			// Pass the base additional data so the test's HTTP requests honour the
			// egress policy carried by its SSRF bridge.
			const context = new CredentialTestContext(baseAdditionalData);
			const functionResult = credentialTestFunction.call(context, credentialsDecrypted);
			if (functionResult instanceof Promise) {
				const result = await functionResult;
				if (typeof result?.message === 'string') {
					// Anonymize secret values in the error message
					result.message = this.redactSecrets(
						result.message,
						credentialsDecrypted.data,
						credentialsDataSecretKeys,
					);
				}
				return result;
			}
			return functionResult;
		}

		// Credentials get tested via request instructions
		return await this.runRequestTest(
			userId,
			credentialType,
			credentialsDecrypted,
			credentialTestFunction,
			'default',
		);
	}

	/**
	 * Execute a request-based credential test through the declarative routing
	 * engine. The `authProbe` verdict treats only 401/403 as rejection and an
	 * unreachable service as inconclusive (OK) — used for ad-hoc probes of
	 * generic credentials against a known endpoint.
	 */
	// eslint-disable-next-line complexity
	private async runRequestTest(
		userId: User['id'],
		credentialType: string,
		credentialsDecrypted: ICredentialsDecrypted,
		credentialTestFunction: ICredentialTestRequestData,
		verdict: 'default' | 'authProbe',
		acceptedStatusCodes?: number[],
	): Promise<INodeCredentialTestResult> {
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
		const runExecutionData = createEmptyRunExecutionData();

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			userId,
			projectId: credentialsDecrypted.homeProject?.id,
			currentNodeParameters: node.parameters,
		});

		const executeData: IExecuteData = { node, data: {}, source: null };
		const executeFunctions = new ExecuteContext(
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
		const routingNode = new RoutingNode(executeFunctions, nodeTypeCopy, credentialsDecrypted);

		let response: INodeExecutionData[][] | null | undefined;
		try {
			await workflow.expression.acquireIsolate();
			response = await routingNode.runNode();
		} catch (error) {
			this.errorReporter.error(error);
			// Do not fail any requests to allow custom error messages and
			// make logic easier
			if (error.cause?.response) {
				const errorResponseData = {
					statusCode: error.cause.response.status,
					statusMessage: error.cause.response.statusText,
				};

				if (verdict === 'authProbe') {
					// Only an explicit auth rejection fails the probe — any other
					// response means the endpoint accepted the credential (it may
					// still dislike the method or path). A service known to answer
					// 401/403 even to valid credentials can declare those codes as
					// accepted — the declaration can only relax the verdict.
					const isRejection =
						(errorResponseData.statusCode === 401 || errorResponseData.statusCode === 403) &&
						!acceptedStatusCodes?.includes(errorResponseData.statusCode);
					if (isRejection) {
						return {
							status: 'Error',
							message: `The service rejected the credential (HTTP ${errorResponseData.statusCode}). Check the key and try again.`,
						};
					}
					return { status: 'OK', message: 'Connection successful!' };
				}

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
				if (verdict === 'authProbe') {
					// Unreachable service — inconclusive, never block the save on it.
					return {
						status: 'OK',
						message: 'Could not reach the service to verify the credential.',
					};
				}
				return {
					status: 'Error',
					message: error.cause.code,
				};
			}
			this.logger.debug('Credential test failed', error);
			if (verdict === 'authProbe') {
				return { status: 'OK', message: 'Could not verify the credential.' };
			}
			return {
				status: 'Error',
				message: error.message.toString(),
			};
		} finally {
			await workflow.expression.releaseIsolate();
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
