/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Service } from 'typedi';
import { Credentials, NodeExecuteFunctions } from 'n8n-core';

import type {
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeParameters,
	INodeProperties,
	INodeType,
	IVersionedNodeType,
	IRequestOptionsSimplified,
	IWorkflowDataProxyAdditionalKeys,
	WorkflowExecuteMode,
	IHttpRequestHelper,
	INodeTypeData,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	IExecuteData,
	IDataObject,
} from 'n8n-workflow';
import { ICredentialsHelper, NodeHelpers, Workflow, ApplicationError } from 'n8n-workflow';

import type { ICredentialsDb } from '@/Interfaces';

import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { NodeTypes } from '@/NodeTypes';
import { CredentialTypes } from '@/CredentialTypes';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { RESPONSE_ERROR_MESSAGES } from './constants';

import { Logger } from '@/Logger';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { CredentialNotFoundError } from './errors/credential-not-found.error';

const mockNode = {
	name: '',
	typeVersion: 1,
	type: 'mock',
	position: [0, 0],
	parameters: {} as INodeParameters,
} as INode;

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
export class CredentialsHelper extends ICredentialsHelper {
	constructor(
		private readonly logger: Logger,
		private readonly credentialTypes: CredentialTypes,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
	) {
		super();
	}

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

				return await credentialType.authenticate(
					credentials,
					requestOptions as IHttpRequestOptions,
				);
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
							keyResolved = this.resolveValue(key, { $credentials: credentials }, workflow, node);

							valueResolved = this.resolveValue(
								value as string,
								{ $credentials: credentials },
								workflow,
								node,
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

		if (expirableProperty?.name === undefined) {
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
	private resolveValue(
		parameterValue: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		workflow: Workflow,
		node: INode,
	): string {
		if (typeof parameterValue !== 'string' || parameterValue.charAt(0) !== '=') {
			return parameterValue;
		}

		const returnValue = workflow.expression.getSimpleParameterValue(
			node,
			parameterValue,
			'internal',
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
		return this.credentialTypes.getParentTypes(typeName);
	}

	/**
	 * Returns the credentials instance
	 */
	async getCredentials(
		nodeCredential: INodeCredentialsDetails,
		type: string,
		userId?: string,
	): Promise<Credentials> {
		if (!nodeCredential.id) {
			throw new ApplicationError('Found credential with no ID.', {
				extra: { credentialName: nodeCredential.name },
				tags: { credentialType: type },
			});
		}

		let credential: CredentialsEntity;

		try {
			credential = userId
				? await this.sharedCredentialsRepository
						.findOneOrFail({
							relations: ['credentials'],
							where: { credentials: { id: nodeCredential.id, type }, userId },
						})
						.then((shared) => shared.credentials)
				: await this.credentialsRepository.findOneByOrFail({ id: nodeCredential.id, type });
		} catch (error) {
			throw new CredentialNotFoundError(nodeCredential.id, type);
		}

		return new Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			credential.data,
		);
	}

	/**
	 * Returns all the properties of the credentials with the given name
	 */
	getCredentialsProperties(type: string): INodeProperties[] {
		const credentialTypeData = this.credentialTypes.getByName(type);

		if (credentialTypeData === undefined) {
			throw new ApplicationError('Unknown credential type', { tags: { credentialType: type } });
		}

		if (credentialTypeData.extends === undefined) {
			// Manually add the special OAuth parameter which stores
			// data like access- and refresh-token
			if (['oAuth1Api', 'oAuth2Api'].includes(type)) {
				return [
					...credentialTypeData.properties,
					{
						displayName: 'oauthTokenData',
						name: 'oauthTokenData',
						type: 'json',
						required: false,
						default: {},
					},
				];
			}

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
	 */
	async getDecrypted(
		additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): Promise<ICredentialDataDecryptedObject> {
		const credentials = await this.getCredentials(nodeCredentials, type);
		const decryptedDataOriginal = credentials.getData();

		if (raw === true) {
			return decryptedDataOriginal;
		}

		await additionalData?.secretsHelpers?.waitForInit();

		const canUseSecrets = await this.credentialOwnedByOwner(nodeCredentials);

		return this.applyDefaultsAndOverwrites(
			additionalData,
			decryptedDataOriginal,
			type,
			mode,
			executeData,
			expressionResolveValues,
			canUseSecrets,
		);
	}

	/**
	 * Applies credential default data and overwrites
	 */
	applyDefaultsAndOverwrites(
		additionalData: IWorkflowExecuteAdditionalData,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
		canUseSecrets?: boolean,
	): ICredentialDataDecryptedObject {
		const credentialsProperties = this.getCredentialsProperties(type);

		// Load and apply the credentials overwrites if any exist
		const dataWithOverwrites = this.credentialsOverwrites.applyOverwrite(
			type,
			decryptedDataOriginal,
		);

		// Add the default credential values
		let decryptedData = NodeHelpers.getNodeParameters(
			credentialsProperties,
			dataWithOverwrites as INodeParameters,
			true,
			false,
			null,
		) as ICredentialDataDecryptedObject;

		if (decryptedDataOriginal.oauthTokenData !== undefined) {
			// The OAuth data gets removed as it is not defined specifically as a parameter
			// on the credentials so add it back in case it was set
			decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
		}

		const additionalKeys = NodeExecuteFunctions.getAdditionalKeys(additionalData, mode, null, {
			secretsEnabled: canUseSecrets,
		});

		if (expressionResolveValues) {
			try {
				decryptedData = expressionResolveValues.workflow.expression.getParameterValue(
					decryptedData as INodeParameters,
					expressionResolveValues.runExecutionData,
					expressionResolveValues.runIndex,
					expressionResolveValues.itemIndex,
					expressionResolveValues.node.name,
					expressionResolveValues.connectionInputData,
					mode,
					additionalKeys,
					executeData,
					false,
					decryptedData,
				) as ICredentialDataDecryptedObject;
			} catch (e) {
				e.message += ' [Error resolving credentials]';
				throw e;
			}
		} else {
			const workflow = new Workflow({
				nodes: [mockNode],
				connections: {},
				active: false,
				nodeTypes: mockNodeTypes,
			});

			// Resolve expressions if any are set
			decryptedData = workflow.expression.getComplexParameterValue(
				mockNode,
				decryptedData as INodeParameters,
				mode,
				additionalKeys,
				undefined,
				undefined,
				decryptedData,
			) as ICredentialDataDecryptedObject;
		}

		return decryptedData;
	}

	/**
	 * Updates credentials in the database
	 */
	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {
		const credentials = await this.getCredentials(nodeCredentials, type);

		credentials.setData(data);
		const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialsData.updatedAt = new Date();

		// Save the credentials in DB
		const findQuery = {
			id: credentials.id,
			type,
		};

		await this.credentialsRepository.update(findQuery, newCredentialsData);
	}

	async credentialOwnedByOwner(nodeCredential: INodeCredentialsDetails): Promise<boolean> {
		if (!nodeCredential.id) {
			return false;
		}

		const credential = await this.sharedCredentialsRepository.findOne({
			where: {
				role: 'credential:owner',
				user: {
					role: 'global:owner',
				},
				credentials: {
					id: nodeCredential.id,
				},
			},
		});

		if (!credential) {
			return false;
		}

		return true;
	}
}

export function createCredentialsFromCredentialsEntity(
	credential: CredentialsEntity,
	encrypt = false,
): Credentials {
	const { id, name, type, data } = credential;
	if (encrypt) {
		return new Credentials({ id: null, name }, type);
	}
	return new Credentials({ id, name }, type, data);
}
