/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Credentials, NodeExecuteFunctions } from 'n8n-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import { get } from 'lodash';

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
	IVersionedNodeType,
	VersionedNodeType,
	IRequestOptionsSimplified,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	NodeHelpers,
	RoutingNode,
	Workflow,
	WorkflowExecuteMode,
	ITaskDataConnections,
	LoggerProxy as Logger,
	ErrorReporterProxy as ErrorReporter,
	IHttpRequestHelper,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ICredentialsDb,
	NodeTypes,
	WhereClause,
	WorkflowExecuteAdditionalData,
} from '.';
// eslint-disable-next-line import/no-cycle
import { User } from './databases/entities/User';
// eslint-disable-next-line import/no-cycle
import { CredentialsEntity } from './databases/entities/CredentialsEntity';

const mockNodeTypes: INodeTypes = {
	nodeTypes: {} as INodeTypeData,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	init: async (nodeTypes?: INodeTypeData): Promise<void> => {},
	getAll(): Array<INodeType | IVersionedNodeType> {
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
		defaultTimezone: string,
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

				let keyResolved: string;
				let valueResolved: string;
				const { authenticate } = credentialType;
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}

				if (authenticate.type === 'generic') {
					Object.entries(authenticate.properties).forEach(([outerKey, outerValue]) => {
						Object.entries(outerValue).forEach(([key, value]) => {
							keyResolved = this.resolveValue(
								key,
								{ $credentials: credentials },
								workflow,
								node,
								defaultTimezone,
							);

							valueResolved = this.resolveValue(
								value as string,
								{ $credentials: credentials },
								workflow,
								node,
								defaultTimezone,
							);

							// @ts-ignore
							if (!requestOptions[outerKey]) {
								// @ts-ignore
								requestOptions[outerKey] = {};
							}
							// @ts-ignore
							requestOptions[outerKey][keyResolved] = valueResolved;
						});
					});
				}
			}
		}

		return requestOptions as IHttpRequestOptions;
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const credentialType = this.credentialTypes.getByName(typeName);

		const expirableProperty = credentialType.properties.find(
			(property) => property.type === 'hidden' && property?.typeOptions?.expirable === true,
		);

		if (expirableProperty === undefined || expirableProperty.name === undefined) {
			return undefined;
		}

		// check if the node is the mockup node used for testing
		// if so, it means this is a credential test and not normal node execution
		const isTestingCredentials =
			node?.parameters?.temp === '' && node?.type === 'n8n-nodes-base.noOp';

		if (credentialType.preAuthentication) {
			if (typeof credentialType.preAuthentication === 'function') {
				// if the expirable property is empty in the credentials
				// or are expired, call pre authentication method
				// or the credentials are being tested
				if (
					credentials[expirableProperty?.name] === '' ||
					credentialsExpired ||
					isTestingCredentials
				) {
					const output = await credentialType.preAuthentication.call(helpers, credentials);

					// if there is data in the output, make sure the returned
					// property is the expirable property
					// else the database will not get updated
					if (output[expirableProperty.name] === undefined) {
						return undefined;
					}

					if (node.credentials) {
						await this.updateCredentials(
							node.credentials[credentialType.name],
							credentialType.name,
							Object.assign(credentials, output),
						);
						return Object.assign(credentials, output);
					}
				}
			}
		}
		return undefined;
	}

	/**
	 * Resolves the given value in case it is an expression
	 */
	resolveValue(
		parameterValue: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		workflow: Workflow,
		node: INode,
		defaultTimezone: string,
	): string {
		if (parameterValue.charAt(0) !== '=') {
			return parameterValue;
		}

		const returnValue = workflow.expression.getSimpleParameterValue(
			node,
			parameterValue,
			'internal',
			defaultTimezone,
			additionalKeys,
			undefined,
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
	 * @param {INodeCredentialsDetails} nodeCredential id and name to return instance of
	 * @param {string} type Type of the credential to return instance of
	 */
	async getCredentials(
		nodeCredential: INodeCredentialsDetails,
		type: string,
		userId?: string,
	): Promise<Credentials> {
		if (!nodeCredential.id) {
			throw new Error(`Credential "${nodeCredential.name}" of type "${type}" has no ID.`);
		}

		const credential = userId
			? await Db.collections.SharedCredentials.findOneOrFail({
					relations: ['credentials'],
					where: { credentials: { id: nodeCredential.id, type }, user: { id: userId } },
			  }).then((shared) => shared.credentials)
			: await Db.collections.Credentials.findOneOrFail({ id: nodeCredential.id, type });

		if (!credential) {
			throw new Error(
				`Credential with ID "${nodeCredential.id}" does not exist for type "${type}".`,
			);
		}

		return new Credentials(
			{ id: credential.id.toString(), name: credential.name },
			credential.type,
			credential.nodesAccess,
			credential.data,
		);
	}

	/**
	 * Returns all the properties of the credentials with the given name
	 *
	 * @param {string} type The name of the type to return credentials off
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

		// The properties defined on the parent credentials take precedence
		NodeHelpers.mergeNodeProperties(combineProperties, credentialTypeData.properties);

		return combineProperties;
	}

	/**
	 * Returns the decrypted credential data with applied overwrites
	 *
	 * @param {INodeCredentialsDetails} nodeCredentials id and name to return instance of
	 * @param {string} type Type of the credentials to return data of
	 * @param {boolean} [raw] Return the data as supplied without defaults or overwrites
	 */
	async getDecrypted(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		defaultTimezone: string,
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
			defaultTimezone,
			expressionResolveValues,
		);
	}

	/**
	 * Applies credential default data and overwrites
	 *
	 * @param {ICredentialDataDecryptedObject} decryptedDataOriginal The credential data to overwrite data on
	 * @param {string} type  Type of the credentials to overwrite data of
	 */
	applyDefaultsAndOverwrites(
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		type: string,
		mode: WorkflowExecuteMode,
		defaultTimezone: string,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): ICredentialDataDecryptedObject {
		const credentialsProperties = this.getCredentialsProperties(type);

		// Add the default credential values
		let decryptedData = NodeHelpers.getNodeParameters(
			credentialsProperties,
			decryptedDataOriginal as INodeParameters,
			true,
			false,
			null,
		) as ICredentialDataDecryptedObject;

		if (decryptedDataOriginal.oauthTokenData !== undefined) {
			// The OAuth data gets removed as it is not defined specifically as a parameter
			// on the credentials so add it back in case it was set
			decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
		}

		if (expressionResolveValues) {
			const timezone =
				(expressionResolveValues.workflow.settings.timezone as string) || defaultTimezone;

			try {
				decryptedData = expressionResolveValues.workflow.expression.getParameterValue(
					decryptedData as INodeParameters,
					expressionResolveValues.runExecutionData,
					expressionResolveValues.runIndex,
					expressionResolveValues.itemIndex,
					expressionResolveValues.node.name,
					expressionResolveValues.connectionInputData,
					mode,
					timezone,
					{},
					undefined,
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
				defaultTimezone,
				{},
				undefined,
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
	 */
	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/await-thenable
		const credentials = await this.getCredentials(nodeCredentials, type);

		if (!Db.isInitialized) {
			// The first time executeWorkflow gets called the Database has
			// to get initialized first
			await Db.init();
		}

		credentials.setData(data, this.encryptionKey);
		const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialsData.updatedAt = new Date();

		// Save the credentials in DB
		const findQuery = {
			id: credentials.id,
			type,
		};

		await Db.collections.Credentials.update(findQuery, newCredentialsData);
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
			if (node instanceof VersionedNodeType) {
				// Node is versioned
				allNodeTypes.push(...Object.values((node as IVersionedNodeType).nodeVersions));
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
								const versions = Object.keys((node as IVersionedNodeType).nodeVersions)
									.sort()
									.reverse();
								for (const version of versions) {
									const versionedNode = (node as IVersionedNodeType).nodeVersions[
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
							// Test is defined as string which links to a function
							return (node as unknown as INodeType).methods?.credentialTest![credential.testedBy];
						}

						// Test is defined as JSON with a definition for the request to make
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
		user: User,
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

		// TODO: Temp workflows get created at multiple locations (for example also LoadNodeParameterOptions),
		//       check if some of them are identical enough that it can be combined

		let nodeType: INodeType;
		if (credentialTestFunction.nodeType) {
			nodeType = credentialTestFunction.nodeType;
		} else {
			const nodeTypes = NodeTypes();
			nodeType = nodeTypes.getByNameAndVersion('n8n-nodes-base.noOp');
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
					id: credentialsDecrypted.id.toString(),
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
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							errorResponseData.statusMessage ||
							// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
							`Received HTTP status code: ${errorResponseData.statusCode}`,
					};
				}
			} else if (error.cause.code) {
				return {
					status: 'Error',
					message: error.cause.code,
				};
			}
			Logger.debug('Credential test failed', error);
			return {
				status: 'Error',
				message: error.message.toString(),
			};
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

/**
 * Build a `where` clause for a `find()` or `findOne()` operation
 * in the `shared_workflow` or `shared_credentials` tables.
 */
export function whereClause({
	user,
	entityType,
	entityId = '',
}: {
	user: User;
	entityType: 'workflow' | 'credentials';
	entityId?: string;
}): WhereClause {
	const where: WhereClause = entityId ? { [entityType]: { id: entityId } } : {};

	if (user.globalRole.name !== 'owner') {
		where.user = { id: user.id };
	}

	return where;
}

/**
 * Get a credential if it has been shared with a user.
 */
export async function getCredentialForUser(
	credentialId: string,
	user: User,
): Promise<ICredentialsDb | null> {
	const sharedCredential = await Db.collections.SharedCredentials.findOne({
		relations: ['credentials'],
		where: whereClause({
			user,
			entityType: 'credentials',
			entityId: credentialId,
		}),
	});

	if (!sharedCredential) return null;

	return sharedCredential.credentials as ICredentialsDb;
}

/**
 * Get a credential without user check
 */
export async function getCredentialWithoutUser(
	credentialId: string,
): Promise<ICredentialsDb | undefined> {
	const credential = await Db.collections.Credentials.findOne(credentialId);
	return credential;
}

export function createCredentialsFromCredentialsEntity(
	credential: CredentialsEntity,
	encrypt = false,
): Credentials {
	const { id, name, type, nodesAccess, data } = credential;
	if (encrypt) {
		return new Credentials({ id: null, name }, type, nodesAccess);
	}
	return new Credentials({ id: id.toString(), name }, type, nodesAccess, data);
}
