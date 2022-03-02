/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Credentials, NodeExecuteFunctions } from 'n8n-core';

import { NodeVersionedType } from 'n8n-nodes-base';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialsExpressionResolveValues,
	ICredentialsHelper,
	ICredentialTestFunction,
	ICredentialTestRequestData,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypeData,
	INodeTypes,
	INodeVersionedType,
	IRequestOptionsSimplified,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	NodeHelpers,
	RoutingNode,
	Workflow,
	WorkflowExecuteMode,
	ITaskDataConnections,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ICredentialsDb,
	NodeTypes,
	WorkflowExecuteAdditionalData,
} from '.';

const mockNodeTypes: INodeTypes = {
	nodeTypes: {} as INodeTypeData,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	init: async (nodeTypes?: INodeTypeData): Promise<void> => {},
	getAll(): Array<INodeType | INodeVersionedType> {
		// @ts-ignore
		return Object.values(this.nodeTypes).map((data) => data.type);
	},
	getByNameAndVersion(nodeType: string, version?: number): INodeType | undefined {
		if (this.nodeTypes[nodeType] === undefined) {
			return undefined;
		}
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	},
};

export class CredentialsHelper extends ICredentialsHelper {
	private credentialTypes = CredentialTypes();

	/**
	 * Add the required authentication information to the request
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		incomingRequestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow: Workflow,
		node: INode,
	): Promise<IHttpRequestOptions> {
		const requestOptions = incomingRequestOptions;
		const credentialType = this.credentialTypes.getByName(typeName);

		if (credentialType.authenticate) {
			if (typeof credentialType.authenticate === 'function') {
				// Special authentication function is defined

				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				return credentialType.authenticate(credentials, requestOptions as IHttpRequestOptions);
			}

			if (typeof credentialType.authenticate === 'object') {
				// Predefined authentication method

				const { authenticate } = credentialType;
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}

				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (authenticate.type === 'bearer') {
					const tokenPropertyName: string =
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.tokenPropertyName ?? 'accessToken';
					requestOptions.headers.Authorization = `Bearer ${
						credentials[tokenPropertyName] as string
					}`;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				} else if (authenticate.type === 'basicAuth') {
					const userPropertyName: string =
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.userPropertyName ?? 'user';
					const passwordPropertyName: string =
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.passwordPropertyName ?? 'password';

					requestOptions.auth = {
						username: credentials[userPropertyName] as string,
						password: credentials[passwordPropertyName] as string,
					};
				} else if (authenticate.type === 'headerAuth') {
					const key = this.resolveValue(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.name,
						{ $credentials: credentials },
						workflow,
						node,
					);

					const value = this.resolveValue(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.value,
						{ $credentials: credentials },
						workflow,
						node,
					);
					requestOptions.headers[key] = value;
				} else if (authenticate.type === 'queryAuth') {
					const key = this.resolveValue(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.key,
						{ $credentials: credentials },
						workflow,
						node,
					);

					const value = this.resolveValue(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						authenticate.properties.value,
						{ $credentials: credentials },
						workflow,
						node,
					);
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}
					requestOptions.qs[key] = value;
				}
			}
		}

		return requestOptions as IHttpRequestOptions;
	}

	/**
	 * Resolves the given value in case it is an expression
	 */
	resolveValue(
		parameterValue: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		workflow: Workflow,
		node: INode,
	): string {
		if (parameterValue.charAt(0) !== '=') {
			return parameterValue;
		}

		const returnValue = workflow.expression.getSimpleParameterValue(
			node,
			parameterValue,
			'internal',
			additionalKeys,
			'',
		);

		if (!returnValue) {
			return '';
		}

		return returnValue.toString();
	}

	/**
	 * Returns all parent types of the given credential type
	 */
	getParentTypes(typeName: string): string[] {
		const credentialType = this.credentialTypes.getByName(typeName);

		if (credentialType === undefined || credentialType.extends === undefined) {
			return [];
		}

		let types: string[] = [];
		credentialType.extends.forEach((type: string) => {
			types = [...types, type, ...this.getParentTypes(type)];
		});

		return types;
	}

	/**
	 * Returns the credentials instance
	 *
	 * @param {INodeCredentialsDetails} nodeCredentials id and name to return instance of
	 * @param {string} type Type of the credentials to return instance of
	 * @returns {Credentials}
	 * @memberof CredentialsHelper
	 */
	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<Credentials> {
		if (!nodeCredentials.id) {
			throw new Error(`Credentials "${nodeCredentials.name}" for type "${type}" don't have an ID.`);
		}

		const credentials = await Db.collections.Credentials?.findOne({ id: nodeCredentials.id, type });

		if (!credentials) {
			throw new Error(
				`Credentials with ID "${nodeCredentials.id}" don't exist for type "${type}".`,
			);
		}

		return new Credentials(
			{ id: credentials.id.toString(), name: credentials.name },
			credentials.type,
			credentials.nodesAccess,
			credentials.data,
		);
	}

	/**
	 * Returns all the properties of the credentials with the given name
	 *
	 * @param {string} type The name of the type to return credentials off
	 * @returns {INodeProperties[]}
	 * @memberof CredentialsHelper
	 */
	getCredentialsProperties(type: string): INodeProperties[] {
		const credentialTypeData = this.credentialTypes.getByName(type);

		if (credentialTypeData === undefined) {
			throw new Error(`The credentials of type "${type}" are not known.`);
		}

		if (credentialTypeData.extends === undefined) {
			return credentialTypeData.properties;
		}

		const combineProperties = [] as INodeProperties[];
		for (const credentialsTypeName of credentialTypeData.extends) {
			const mergeCredentialProperties = this.getCredentialsProperties(credentialsTypeName);
			NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
		}

		// The properties defined on the parent credentials take presidence
		NodeHelpers.mergeNodeProperties(combineProperties, credentialTypeData.properties);

		return combineProperties;
	}

	/**
	 * Returns the decrypted credential data with applied overwrites
	 *
	 * @param {INodeCredentialsDetails} nodeCredentials id and name to return instance of
	 * @param {string} type Type of the credentials to return data of
	 * @param {boolean} [raw] Return the data as supplied without defaults or overwrites
	 * @returns {ICredentialDataDecryptedObject}
	 * @memberof CredentialsHelper
	 */
	async getDecrypted(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): Promise<ICredentialDataDecryptedObject> {
		const credentials = await this.getCredentials(nodeCredentials, type);
		const decryptedDataOriginal = credentials.getData(this.encryptionKey);

		if (raw === true) {
			return decryptedDataOriginal;
		}

		return this.applyDefaultsAndOverwrites(
			decryptedDataOriginal,
			type,
			mode,
			expressionResolveValues,
		);
	}

	/**
	 * Applies credential default data and overwrites
	 *
	 * @param {ICredentialDataDecryptedObject} decryptedDataOriginal The credential data to overwrite data on
	 * @param {string} type  Type of the credentials to overwrite data of
	 * @returns {ICredentialDataDecryptedObject}
	 * @memberof CredentialsHelper
	 */
	applyDefaultsAndOverwrites(
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		type: string,
		mode: WorkflowExecuteMode,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): ICredentialDataDecryptedObject {
		const credentialsProperties = this.getCredentialsProperties(type);

		// Add the default credential values
		let decryptedData = NodeHelpers.getNodeParameters(
			credentialsProperties,
			decryptedDataOriginal as INodeParameters,
			true,
			false,
		) as ICredentialDataDecryptedObject;

		if (decryptedDataOriginal.oauthTokenData !== undefined) {
			// The OAuth data gets removed as it is not defined specifically as a parameter
			// on the credentials so add it back in case it was set
			decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
		}

		if (expressionResolveValues) {
			try {
				const workflow = new Workflow({
					nodes: Object.values(expressionResolveValues.workflow.nodes),
					connections: expressionResolveValues.workflow.connectionsBySourceNode,
					active: false,
					nodeTypes: expressionResolveValues.workflow.nodeTypes,
				});
				decryptedData = workflow.expression.getParameterValue(
					decryptedData as INodeParameters,
					expressionResolveValues.runExecutionData,
					expressionResolveValues.runIndex,
					expressionResolveValues.itemIndex,
					expressionResolveValues.node.name,
					expressionResolveValues.connectionInputData,
					mode,
					{},
					false,
					decryptedData,
				) as ICredentialDataDecryptedObject;
			} catch (e) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				e.message += ' [Error resolving credentials]';
				throw e;
			}
		} else {
			const node = {
				name: '',
				typeVersion: 1,
				type: 'mock',
				position: [0, 0],
				parameters: {} as INodeParameters,
			} as INode;

			const workflow = new Workflow({
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: mockNodeTypes,
			});

			// Resolve expressions if any are set
			decryptedData = workflow.expression.getComplexParameterValue(
				node,
				decryptedData as INodeParameters,
				mode,
				{},
				undefined,
				decryptedData,
			) as ICredentialDataDecryptedObject;
		}

		// Load and apply the credentials overwrites if any exist
		const credentialsOverwrites = CredentialsOverwrites();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return credentialsOverwrites.applyOverwrite(type, decryptedData);
	}

	/**
	 * Updates credentials in the database
	 *
	 * @param {string} name Name of the credentials to set data of
	 * @param {string} type Type of the credentials to set data of
	 * @param {ICredentialDataDecryptedObject} data The data to set
	 * @returns {Promise<void>}
	 * @memberof CredentialsHelper
	 */
	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/await-thenable
		const credentials = await this.getCredentials(nodeCredentials, type);

		if (Db.collections.Credentials === null) {
			// The first time executeWorkflow gets called the Database has
			// to get initialized first
			await Db.init();
		}

		credentials.setData(data, this.encryptionKey);
		const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialsData.updatedAt = new Date();

		// TODO: also add user automatically depending on who is logged in, if anybody is logged in

		// Save the credentials in DB
		const findQuery = {
			id: credentials.id,
			type,
		};

		await Db.collections.Credentials!.update(findQuery, newCredentialsData);
	}

	getCredentialTestFunction(
		credentialType: string,
		nodeToTestWith?: string,
	): ICredentialTestFunction | ICredentialTestRequestData | undefined {
		const nodeTypes = NodeTypes();
		const allNodes = nodeTypes.getAll();

		// Check all the nodes one by one if they have a test function defined
		for (let i = 0; i < allNodes.length; i++) {
			const node = allNodes[i];

			if (nodeToTestWith && node.description.name !== nodeToTestWith) {
				// eslint-disable-next-line no-continue
				continue;
			}

			// Always set to an array even if node is not versioned to not having
			// to duplicate the logic
			const allNodeTypes: INodeType[] = [];
			if (node instanceof NodeVersionedType) {
				// Node is versioned
				allNodeTypes.push(...Object.values((node as INodeVersionedType).nodeVersions));
			} else {
				// Node is not versioned
				allNodeTypes.push(node as INodeType);
			}

			// Check each of the node versions for credential tests
			for (const nodeType of allNodeTypes) {
				// Check each of teh credentials
				for (const credential of nodeType.description.credentials ?? []) {
					if (credential.name === credentialType && !!credential.testedBy) {
						if (typeof credential.testedBy === 'string') {
							if (Object.prototype.hasOwnProperty.call(node, 'nodeVersions')) {
								// The node is versioned. So check all versions for test function
								// starting with the latest
								const versions = Object.keys((node as INodeVersionedType).nodeVersions)
									.sort()
									.reverse();
								for (const version of versions) {
									const versionedNode = (node as INodeVersionedType).nodeVersions[
										parseInt(version, 10)
									];
									if (
										versionedNode.methods?.credentialTest &&
										versionedNode.methods?.credentialTest[credential.testedBy]
									) {
										return versionedNode.methods?.credentialTest[credential.testedBy];
									}
								}
							}
							// Test is defined as string which links to a functoin
							return (node as unknown as INodeType).methods?.credentialTest![credential.testedBy];
						}

						// Test is defined as JSON with a defintion for the request to make
						return {
							nodeType,
							testRequest: credential.testedBy,
						};
					}
				}
			}
		}

		// Check if test is defined on credentials
		const type = this.credentialTypes.getByName(credentialType);
		if (type.test) {
			return {
				testRequest: type.test,
			};
		}

		return undefined;
	}

	async testCredentials(
		credentialType: string,
		credentialsDecrypted: ICredentialsDecrypted,
		nodeToTestWith?: string,
	): Promise<INodeCredentialTestResult> {
		const credentialTestFunction = this.getCredentialTestFunction(credentialType, nodeToTestWith);

		if (credentialTestFunction === undefined) {
			return Promise.resolve({
				status: 'Error',
				message: 'No testing function found for this credential.',
			});
		}

		if (typeof credentialTestFunction === 'function') {
			// The credentials get tested via a function that is defined on the node
			const credentialTestFunctions = NodeExecuteFunctions.getCredentialTestFunctions();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			return credentialTestFunction.call(credentialTestFunctions, credentialsDecrypted);
		}

		// Credentials get tested via request instructions

		// TODO: Temp worfklows get created at multiple locations (for example also LoadNodeParameterOptions),
		//       check if some of them are identical enough that it can be combined

		let nodeType: INodeType;
		if (credentialTestFunction.nodeType) {
			nodeType = credentialTestFunction.nodeType;
		} else {
			const nodeTypes = NodeTypes();
			nodeType = nodeTypes.getByNameAndVersion('n8n-nodes-base.noOp');
		}

		const node: INode = {
			parameters: {},
			name: 'Temp-Node',
			type: nodeType.description.name,
			typeVersion: nodeType.description.version,
			position: [0, 0],
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

		const nodeTypes: INodeTypes = {
			...mockNodeTypes,
			nodeTypes: {
				[nodeTypeCopy.description.name]: {
					sourcePath: '',
					type: nodeTypeCopy,
				},
			},
		};

		const workflow = new Workflow({
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes,
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

		const additionalData = await WorkflowExecuteAdditionalData.getBase(node.parameters);

		const routingNode = new RoutingNode(
			workflow,
			node,
			connectionInputData,
			runExecutionData ?? null,
			additionalData,
			mode,
		);

		try {
			await routingNode.runNode(
				inputData,
				runIndex,
				nodeTypeCopy,
				NodeExecuteFunctions,
				credentialsDecrypted,
			);
		} catch (error) {
			// Do not fail any requests to allow custom error messages and
			// make logic easier
			if (error.cause.response) {
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
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							errorResponseData.statusMessage ||
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							`Received HTTP status code: ${errorResponseData.statusCode}`,
					};
				}
			}

			return {
				status: 'Error',
				message: error.message.toString(),
			};
		}

		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	}
}
