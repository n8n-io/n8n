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
exports.CredentialsHelper = void 0;
exports.createCredentialsFromCredentialsEntity = createCredentialsFromCredentialsEntity;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const credential_types_1 = require('@/credential-types');
const credentials_overwrites_1 = require('@/credentials-overwrites');
const constants_1 = require('./constants');
const credential_not_found_error_1 = require('./errors/credential-not-found.error');
const cache_service_1 = require('./services/cache/cache.service');
const mockNode = {
	name: '',
	typeVersion: 1,
	type: 'mock',
	position: [0, 0],
	parameters: {},
};
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
let CredentialsHelper = class CredentialsHelper extends n8n_workflow_1.ICredentialsHelper {
	constructor(
		credentialTypes,
		credentialsOverwrites,
		credentialsRepository,
		sharedCredentialsRepository,
		cacheService,
	) {
		super();
		this.credentialTypes = credentialTypes;
		this.credentialsOverwrites = credentialsOverwrites;
		this.credentialsRepository = credentialsRepository;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.cacheService = cacheService;
	}
	async authenticate(credentials, typeName, incomingRequestOptions, workflow, node) {
		const requestOptions = incomingRequestOptions;
		const credentialType = this.credentialTypes.getByName(typeName);
		if (credentialType.authenticate) {
			if (typeof credentialType.authenticate === 'function') {
				return await credentialType.authenticate(credentials, requestOptions);
			}
			if (typeof credentialType.authenticate === 'object') {
				let keyResolved;
				let valueResolved;
				const { authenticate } = credentialType;
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}
				if (authenticate.type === 'generic') {
					Object.entries(authenticate.properties).forEach(([outerKey, outerValue]) => {
						Object.entries(outerValue).forEach(([key, value]) => {
							keyResolved = this.resolveValue(key, { $credentials: credentials }, workflow, node);
							valueResolved = this.resolveValue(
								value,
								{ $credentials: credentials },
								workflow,
								node,
							);
							if (!requestOptions[outerKey]) {
								requestOptions[outerKey] = {};
							}
							requestOptions[outerKey][keyResolved] = valueResolved;
						});
					});
				}
			}
		}
		return requestOptions;
	}
	async preAuthentication(helpers, credentials, typeName, node, credentialsExpired) {
		const credentialType = this.credentialTypes.getByName(typeName);
		const expirableProperty = credentialType.properties.find(
			(property) => property.type === 'hidden' && property?.typeOptions?.expirable === true,
		);
		if (expirableProperty?.name === undefined) {
			return undefined;
		}
		const isTestingCredentials =
			node?.parameters?.temp === '' && node?.type === 'n8n-nodes-base.noOp';
		if (credentialType.preAuthentication) {
			if (typeof credentialType.preAuthentication === 'function') {
				if (
					credentials[expirableProperty?.name] === '' ||
					credentialsExpired ||
					isTestingCredentials
				) {
					const output = await credentialType.preAuthentication.call(helpers, credentials);
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
	resolveValue(parameterValue, additionalKeys, workflow, node) {
		if (!(0, n8n_workflow_1.isExpression)(parameterValue)) {
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
	getParentTypes(typeName) {
		return this.credentialTypes.getParentTypes(typeName);
	}
	async getCredentials(nodeCredential, type) {
		if (!nodeCredential.id) {
			throw new n8n_workflow_1.UnexpectedError('Found credential with no ID.', {
				extra: { credentialName: nodeCredential.name },
				tags: { credentialType: type },
			});
		}
		let credential;
		try {
			credential = await this.credentialsRepository.findOneByOrFail({
				id: nodeCredential.id,
				type,
			});
		} catch (error) {
			if (error instanceof typeorm_1.EntityNotFoundError) {
				throw new credential_not_found_error_1.CredentialNotFoundError(nodeCredential.id, type);
			}
			throw error;
		}
		return new n8n_core_1.Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			credential.data,
		);
	}
	getCredentialsProperties(type) {
		const credentialTypeData = this.credentialTypes.getByName(type);
		if (credentialTypeData === undefined) {
			throw new n8n_workflow_1.UnexpectedError('Unknown credential type', {
				tags: { credentialType: type },
			});
		}
		if (credentialTypeData.extends === undefined) {
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
		const combineProperties = [];
		for (const credentialsTypeName of credentialTypeData.extends) {
			const mergeCredentialProperties = this.getCredentialsProperties(credentialsTypeName);
			n8n_workflow_1.NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
		}
		n8n_workflow_1.NodeHelpers.mergeNodeProperties(
			combineProperties,
			credentialTypeData.properties,
		);
		return combineProperties;
	}
	async getDecrypted(
		additionalData,
		nodeCredentials,
		type,
		mode,
		executeData,
		raw,
		expressionResolveValues,
	) {
		const credentials = await this.getCredentials(nodeCredentials, type);
		const decryptedDataOriginal = credentials.getData();
		if (raw === true) {
			return decryptedDataOriginal;
		}
		return await this.applyDefaultsAndOverwrites(
			additionalData,
			decryptedDataOriginal,
			nodeCredentials,
			type,
			mode,
			executeData,
			expressionResolveValues,
		);
	}
	async applyDefaultsAndOverwrites(
		additionalData,
		decryptedDataOriginal,
		credential,
		type,
		mode,
		executeData,
		expressionResolveValues,
	) {
		const credentialsProperties = this.getCredentialsProperties(type);
		const dataWithOverwrites = this.credentialsOverwrites.applyOverwrite(
			type,
			decryptedDataOriginal,
		);
		let decryptedData = n8n_workflow_1.NodeHelpers.getNodeParameters(
			credentialsProperties,
			dataWithOverwrites,
			true,
			false,
			null,
			null,
		);
		if (decryptedDataOriginal.oauthTokenData !== undefined) {
			decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
		}
		const canUseExternalSecrets = await this.credentialCanUseExternalSecrets(credential);
		const additionalKeys = (0, n8n_core_1.getAdditionalKeys)(additionalData, mode, null, {
			secretsEnabled: canUseExternalSecrets,
		});
		if (expressionResolveValues) {
			try {
				decryptedData = expressionResolveValues.workflow.expression.getParameterValue(
					decryptedData,
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
				);
			} catch (e) {
				e.message += ' [Error resolving credentials]';
				throw e;
			}
		} else {
			const workflow = new n8n_workflow_1.Workflow({
				nodes: [mockNode],
				connections: {},
				active: false,
				nodeTypes: mockNodeTypes,
			});
			decryptedData = workflow.expression.getComplexParameterValue(
				mockNode,
				decryptedData,
				mode,
				additionalKeys,
				undefined,
				undefined,
				decryptedData,
			);
		}
		return decryptedData;
	}
	async updateCredentials(nodeCredentials, type, data) {
		const credentials = await this.getCredentials(nodeCredentials, type);
		credentials.setData(data);
		const newCredentialsData = credentials.getDataToSave();
		newCredentialsData.updatedAt = new Date();
		const findQuery = {
			id: credentials.id,
			type,
		};
		await this.credentialsRepository.update(findQuery, newCredentialsData);
	}
	async updateCredentialsOauthTokenData(nodeCredentials, type, data) {
		const credentials = await this.getCredentials(nodeCredentials, type);
		credentials.updateData({ oauthTokenData: data.oauthTokenData });
		const newCredentialsData = credentials.getDataToSave();
		newCredentialsData.updatedAt = new Date();
		const findQuery = {
			id: credentials.id,
			type,
		};
		await this.credentialsRepository.update(findQuery, newCredentialsData);
	}
	async credentialCanUseExternalSecrets(nodeCredential) {
		if (!nodeCredential.id) {
			return false;
		}
		return (
			(await this.cacheService.get(`credential-can-use-secrets:${nodeCredential.id}`, {
				refreshFn: async () => {
					const credential = await this.sharedCredentialsRepository.findOne({
						where: {
							role: 'credential:owner',
							project: {
								projectRelations: {
									role: (0, typeorm_1.In)(['project:personalOwner', 'project:admin']),
									user: {
										role: (0, typeorm_1.In)(['global:owner', 'global:admin']),
									},
								},
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
				},
			})) ?? false
		);
	}
};
exports.CredentialsHelper = CredentialsHelper;
exports.CredentialsHelper = CredentialsHelper = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			credential_types_1.CredentialTypes,
			credentials_overwrites_1.CredentialsOverwrites,
			db_1.CredentialsRepository,
			db_1.SharedCredentialsRepository,
			cache_service_1.CacheService,
		]),
	],
	CredentialsHelper,
);
function createCredentialsFromCredentialsEntity(credential, encrypt = false) {
	const { id, name, type, data } = credential;
	if (encrypt) {
		return new n8n_core_1.Credentials({ id: null, name }, type);
	}
	return new n8n_core_1.Credentials({ id, name }, type, data);
}
//# sourceMappingURL=credentials-helper.js.map
