import { SYSTEM_RESOLVER_ID } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { CredentialsEntity, ICredentialsDb } from '@n8n/db';
import {
	CredentialsRepository,
	isEntityNotFoundError,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Credentials, FULL_ACCESS_NODE_TYPES } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	ICredentialsExpressionResolveValues,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeProperties,
	IRequestOptionsSimplified,
	WorkflowExecuteMode,
	IHttpRequestHelper,
	IWorkflowExecuteAdditionalData,
	Workflow,
	IExecuteData,
	IGetDecryptedCredentialsOptions,
	IDataObject,
} from 'n8n-workflow';
import {
	ICredentialsHelper,
	MANAGED_VERSION_KEY,
	NodeHelpers,
	classifyTriggerIdentity,
	isExpression,
} from 'n8n-workflow';
import { UnexpectedError, UserError } from '@n8n/errors';

import { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { hasTokenData } from '@/managed-versions';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { DynamicCredentialsProxy } from './credentials/dynamic-credentials-proxy';
import {
	authenticateCredential,
	prepareCredentialData,
	preAuthenticateCredential,
	runCredentialPreAuthentication,
} from './credentials/credential-operations';
import { CredentialMissingIdError } from './errors/credential-missing-id.error';
import { CredentialNotFoundError } from './errors/credential-not-found.error';
import { UnsupportedEndUserCredentialTriggerError } from './errors/unsupported-end-user-credential-trigger.error';

/** A run names no user: the starter is not known reliably on every path, so a run never guesses. */
function decryptActor({ executionId, userId }: IWorkflowExecuteAdditionalData): PolicyActor {
	if (executionId) return { kind: 'system', reason: 'execution', executionId };
	if (userId) return { kind: 'user', user: { id: userId } };
	return { kind: 'system', reason: 'execution' };
}

@Service()
export class CredentialsHelper extends ICredentialsHelper {
	/**
	 * Ciphertext each decrypted credential object was read from. An OAuth token written back
	 * later was minted with the client fields in that object, so the write is dropped when the
	 * row changed in between (e.g. a save that replaced the OAuth client). Keyed by identity:
	 * the object `getDecrypted` returns is the one core hands back to the write.
	 */
	private readonly storedDataByDecrypted = new WeakMap<ICredentialDataDecryptedObject, string>();

	constructor(
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly dynamicCredentialsProxy: DynamicCredentialsProxy,
		private readonly secretsProviderConnectionRepository: SecretsProviderConnectionRepository,
		private readonly licenseState: LicenseState,
		private readonly externalSecretsConfig: ExternalSecretsConfig,
		private readonly aiGatewayService: AiGatewayService,
		private readonly policyEnforcementService: PolicyEnforcementService,
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
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		return await authenticateCredential(
			this.credentialTypes.getByName(typeName),
			credentials,
			incomingRequestOptions,
			workflow,
			node,
		);
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const credentialType = this.credentialTypes.getByName(typeName);
		const prepared = await preAuthenticateCredential({
			credentialType,
			helpers,
			credentials,
			node,
			credentialsExpired,
		});
		if (!prepared || !node.credentials) return undefined;
		const nodeCredentials = node.credentials[credentialType.name];
		const storedData = await (
			await this.getCredentials(nodeCredentials, credentialType.name)
		).getData();
		const dataToPersist: ICredentialDataDecryptedObject = { ...storedData };
		for (const [key, value] of Object.entries(prepared.data)) {
			if (key === prepared.property || !isExpression(storedData[key])) dataToPersist[key] = value;
		}
		await this.updateCredentials(nodeCredentials, credentialType.name, dataToPersist);
		return Object.assign(credentials, prepared.data);
	}

	/**
	 * Invokes a credential's `preAuthentication` hook for in-memory transformation,
	 * without the expirable-property guard or DB persistence. Used by `requestOAuth2`
	 * to transform `oauthTokenData` on every request (e.g. extracting a claim from a
	 * decrypted JWE/JWT) without writing to the database on every call.
	 */
	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return await runCredentialPreAuthentication(
			this.credentialTypes.getByName(typeName),
			helpers,
			credentials,
		);
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
	): Promise<Credentials> {
		const credential = await this.getCredentialsEntity(nodeCredential, type);

		return new Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			credential.data,
		);
	}

	/**
	 * Loads the credentials entity from the database
	 */
	private async getCredentialsEntity(
		nodeCredential: INodeCredentialsDetails,
		type: string,
	): Promise<CredentialsEntity> {
		if (!nodeCredential.id) {
			throw new CredentialMissingIdError(nodeCredential.name, type);
		}

		let credential: CredentialsEntity;

		try {
			credential = await this.credentialsRepository.findOneByOrFail({
				id: nodeCredential.id,
				type,
			});
		} catch (error) {
			if (isEntityNotFoundError(error)) {
				throw new CredentialNotFoundError(nodeCredential.id, type);
			}

			throw error;
		}

		// Keep non-project credentials blocked even if an earlier access check is bypassed.
		if (credential.usageScope !== 'project') {
			throw new UserError('This credential cannot be used in workflows');
		}

		return credential;
	}

	isCredentialUsableByNode(credentialType: string, nodeType: string): boolean {
		let typeDef: ICredentialType;
		try {
			typeDef = this.credentialTypes.getByName(credentialType);
		} catch {
			// Unknown credential type — let downstream code surface the real error.
			return true;
		}

		if (!typeDef.restrictToSupportedNodes) return true;

		// `typeDef.supportedNodes` from the loader holds short node names; the FQ
		// list (matching the `nodeType` we receive) is exposed via `getSupportedNodes`.
		return this.credentialTypes.getSupportedNodes(credentialType).includes(nodeType);
	}

	/** Whether the credential type offers Automatic OAuth mode (dynamic client registration). */
	supportsDynamicClientRegistration(type: string): boolean {
		return !!this.credentialTypes.getByName(type)?.dynamicClientRegistration;
	}

	/**
	 * Returns all the properties of the credentials with the given name
	 */
	getCredentialsProperties(type: string): INodeProperties[] {
		const credentialTypeData = this.credentialTypes.getByName(type);

		if (credentialTypeData === undefined) {
			throw new UnexpectedError('Unknown credential type', { tags: { credentialType: type } });
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

	private assertTriggerSupportsEndUserCredential(
		credentialsEntity: CredentialsEntity,
		additionalData: IWorkflowExecuteAdditionalData,
		executeData: IExecuteData | undefined,
	): void {
		if (!executeData) return;

		const resolverId =
			credentialsEntity.resolverId ??
			this.dynamicCredentialsProxy.getEffectiveResolverId(additionalData.workflowSettings);
		if (!resolverId) return;

		const isSystemResolver = resolverId === SYSTEM_RESOLVER_ID;
		const { providesN8nIdentity, providesExternalIdentity } = classifyTriggerIdentity(
			executeData.node.type,
			executeData.node.parameters,
		);
		const supportsResolver = isSystemResolver ? providesN8nIdentity : providesExternalIdentity;

		if (!supportsResolver) {
			throw new UnsupportedEndUserCredentialTriggerError(isSystemResolver ? 'system' : 'custom');
		}
	}

	/**
	 * Returns the decrypted credential data with applied overwrites. `options.managedVersion`
	 * names the managed app to apply. By default it is the version stored on the credential.
	 */
	async getDecrypted(
		additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
		options?: IGetDecryptedCredentialsOptions & { actor?: PolicyActor; managedVersion?: number },
	): Promise<ICredentialDataDecryptedObject> {
		// Sub-nodes, such as a chat model connected to a chain or agent, inherit executeData.node
		// from their parent. Prefer expressionResolveValues.node when present: it is always
		// the node making this call to resolve credentials.
		const consumerNode = expressionResolveValues?.node ?? executeData?.node;

		if (nodeCredentials.__aiGatewayManaged) {
			const { userId, workflowId, projectId, executionId } = additionalData;
			return await this.aiGatewayService.getSyntheticCredential({
				credentialType: type,
				userId,
				workflowId,
				projectId,
				executionId,
				node: consumerNode,
			});
		}

		const credentialsEntity = await this.getCredentialsEntity(nodeCredentials, type);

		// Managed credentials are unavailable to nodes that can request undeclared types.
		if (
			credentialsEntity.isManaged &&
			consumerNode &&
			FULL_ACCESS_NODE_TYPES.has(consumerNode.type)
		) {
			throw new UserError('Managed credentials are not supported by this node');
		}

		// Validate against the executing project's policy before any decryption happens.
		await this.policyEnforcementService.enforceCredentialDecrypt(
			{
				credentialType: type,
				credentialId: credentialsEntity.id,
				consumer: consumerNode ? { nodeType: consumerNode.type } : null,
				projectId: additionalData.projectId ?? null,
			},
			options?.actor ?? decryptActor(additionalData),
		);

		const credentials = new Credentials(
			{ id: credentialsEntity.id, name: credentialsEntity.name },
			credentialsEntity.type,
			credentialsEntity.data,
		);
		let decryptedDataOriginal = await credentials.getData();

		// In manual or internal mode (or when the root execution is manual, e.g. a subworkflow
		// called from a manual parent), skip dynamic resolution unless a credentials context is
		// present or a trigger explicitly requests the credential. Canvas action-node tests have
		// no incoming request, so they fall back to static data for easier developer testing.
		// Trigger contexts opt in so a missing identity produces an actionable error instead.
		// Internal mode is used by OAuth authorize/revoke flows which are not actual workflow
		// executions and should not trigger dynamic resolution.
		// For all other modes (especially production), always attempt resolution —
		// missing credentials will surface an error rather than silently falling back to
		// static data.
		const effectiveMode = additionalData.rootExecutionMode ?? mode;
		const skipDynamicResolution = effectiveMode === 'manual' || effectiveMode === 'internal';
		const isManualTriggerCredentialRequest =
			effectiveMode === 'manual' &&
			options?.credentialUsage === 'trigger' &&
			credentialsEntity.isResolvable;
		const shouldAttemptDynamicResolution =
			additionalData.executionContext?.credentials !== undefined ||
			isManualTriggerCredentialRequest ||
			!skipDynamicResolution;

		// Mark that this execution attempted to run with a private credential before
		// resolution is attempted, so the flag survives even when resolution throws
		// (e.g. the running user has not connected the credential). Telemetry-only;
		// the redaction layer relies on `currentNodeUsedDynamicCredentials` instead.
		if (shouldAttemptDynamicResolution && credentialsEntity.isResolvable) {
			additionalData.currentNodeAttemptedDynamicCredentials = true;
		}

		if (
			isManualTriggerCredentialRequest &&
			additionalData.executionContext?.credentials === undefined
		) {
			this.assertTriggerSupportsEndUserCredential(credentialsEntity, additionalData, executeData);
		}

		if (shouldAttemptDynamicResolution) {
			// Resolve dynamic credentials if configured (EE feature)
			const resolveResult = await this.dynamicCredentialsProxy.resolveIfNeeded(
				{
					id: credentialsEntity.id,
					name: credentialsEntity.name,
					type: credentialsEntity.type,
					isResolvable: credentialsEntity.isResolvable,
					resolverId: credentialsEntity.resolverId ?? undefined,
				},
				decryptedDataOriginal,
				additionalData.executionContext,
				additionalData.workflowSettings,
				additionalData.executionId,
			);
			decryptedDataOriginal = resolveResult.data;
			if (resolveResult.isDynamic) {
				additionalData.currentNodeUsedDynamicCredentials = true;
				if (resolveResult.resolvedUserId) {
					additionalData.dynamicCredentialsResolvedUserId = resolveResult.resolvedUserId;
				}
			}
		}

		if (raw === true) {
			return this.trackStoredData(decryptedDataOriginal, credentialsEntity);
		}

		if (
			this.licenseState.isExternalSecretsLicensed() &&
			this.externalSecretsConfig.externalSecretsForProjects
		) {
			const accessibleProviderKeys =
				await this.secretsProviderConnectionRepository.findAllAccessibleProviderKeysByCredentialId(
					credentialsEntity.id,
				);
			additionalData.externalSecretProviderKeysAccessibleByCredential = new Set(
				accessibleProviderKeys,
			);
		}

		const decryptedData = await this.applyDefaultsAndOverwrites(
			additionalData,
			decryptedDataOriginal,
			type,
			mode,
			executeData,
			expressionResolveValues,
			options?.managedVersion,
		);
		return this.trackStoredData(decryptedData, credentialsEntity);
	}

	private trackStoredData<T extends ICredentialDataDecryptedObject>(
		decryptedData: T,
		credentialsEntity: CredentialsEntity,
	): T {
		if (credentialsEntity.data) {
			this.storedDataByDecrypted.set(decryptedData, credentialsEntity.data);
		}
		return decryptedData;
	}

	/**
	 * The managed app version that a new connection of this credential stores.
	 * `undefined` when the credential does not use a managed app.
	 */
	getNewConnectionVersion(type: string, decryptedData: ICredentialDataDecryptedObject) {
		return this.credentialsOverwrites.getNewConnectionVersion(type, decryptedData);
	}

	/**
	 * The managed app version that issued the tokens of a credential. `undefined` for a user-owned
	 * client or a credential with no tokens.
	 */
	getBoundVersion(type: string, decryptedData: ICredentialDataDecryptedObject) {
		return this.credentialsOverwrites.resolveBoundVersion(type, decryptedData);
	}

	/**
	 * Applies credential default data and overwrites
	 *
	 * @param managedVersion the managed app version to use. By default it is the version of the credential.
	 */
	async applyDefaultsAndOverwrites(
		additionalData: IWorkflowExecuteAdditionalData,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
		managedVersion?: number,
	): Promise<ICredentialDataDecryptedObject> {
		return await prepareCredentialData({
			credentialType: this.credentialTypes.getByName(type),
			properties: this.getCredentialsProperties(type),
			data: decryptedDataOriginal,
			applyOverwrite: (data) =>
				this.credentialsOverwrites.applyOverwrite(type, data, managedVersion),
			additionalData,
			mode,
			executeData,
			expressionResolveValues,
		});
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

		await credentials.setData(data);
		// Ciphertext only. `name` and `type` would be written back unchanged, and a payload
		// that cannot carry `type` keeps this off the sealed `credentialSave` path.
		const newCredentialsData: Pick<ICredentialsDb, 'data' | 'updatedAt'> = {
			data: credentials.getDataToSave().data,
			updatedAt: new Date(),
		};

		// Save the credentials in DB
		const findQuery = {
			id: credentials.id,
			type,
		};

		await this.credentialsRepository.update(findQuery, newCredentialsData);
	}

	/**
	 * Updates credential's oauth token data in the database
	 */
	async updateCredentialsOauthTokenData(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<void> {
		const credentialsEntity = await this.getCredentialsEntity(nodeCredentials, type);

		const resolverId =
			credentialsEntity.resolverId ??
			this.dynamicCredentialsProxy.getEffectiveResolverId(additionalData.workflowSettings);

		if (
			credentialsEntity.isResolvable &&
			resolverId &&
			additionalData.executionContext?.credentials
		) {
			const credentials = await this.getCredentials(nodeCredentials, type);
			const staticData = await credentials.getData();

			await this.dynamicCredentialsProxy.storeOAuthTokenDataIfNeeded(
				{
					id: credentialsEntity.id,
					name: credentialsEntity.name,
					type: credentialsEntity.type,
					isResolvable: credentialsEntity.isResolvable,
					resolverId,
				},
				data.oauthTokenData as IDataObject,
				additionalData.executionContext,
				staticData,
				additionalData.workflowSettings,
				additionalData.executionId,
			);
			return;
		}

		const credentials = await this.getCredentials(nodeCredentials, type);

		// The token was minted with the client fields in `data`. When the row was rewritten since
		// `data` was read, the token may belong to a client that is no longer stored, so it is not
		// persisted: the next execution finds no token and mints one from the current row.
		const storedData = this.storedDataByDecrypted.get(data);
		if (storedData !== undefined && storedData !== credentials.data) {
			return;
		}

		const oauthTokenData = await this.getTokenDataForFirstConnection(
			type,
			credentials,
			data.oauthTokenData,
		);
		await credentials.updateData({ oauthTokenData });
		const { data: newData } = credentials.getDataToSave();
		if (newData === undefined) {
			throw new UnexpectedError('Credential data is missing after re-encryption');
		}
		// Ciphertext only. `name` and `type` would be written back unchanged, and a payload
		// that cannot carry `type` keeps this off the sealed `credentialSave` path.
		const newCredentialsData: Pick<ICredentialsDb, 'data' | 'updatedAt'> = {
			data: newData,
			updatedAt: new Date(),
		};

		if (storedData === undefined) {
			await this.credentialsRepository.update({ id: credentials.id, type }, newCredentialsData);
			return;
		}

		// The check above and this write are two statements, so the row itself is the guard: the
		// update matches only while the row still holds the ciphertext that `data` was read from.
		const written = await this.credentialsRepository.updateDataIfUnchanged(
			credentialsEntity.id,
			type,
			storedData,
			newData,
		);
		if (written) {
			// A later refresh in the same execution must compare against what is stored now.
			this.storedDataByDecrypted.set(data, newData);
		}
	}

	/**
	 * Returns the token data with the managed app version added when this is the first token of a
	 * managed credential. In any other case it returns the data unchanged. It reads the stored
	 * credential to decide.
	 *
	 * A token that n8n fetches itself (client credentials) has no callback that stores the
	 * version. The first token gets the version of the default app, which the execution used to
	 * fetch it. A refresh keeps the stored version.
	 */
	private async getTokenDataForFirstConnection(
		type: string,
		credentials: Credentials,
		tokenData: ICredentialDataDecryptedObject['oauthTokenData'],
	) {
		if (!isRecord(tokenData) || tokenData[MANAGED_VERSION_KEY] !== undefined) return tokenData;
		// Most instances have no overwrite. Skip the decrypt of the stored data for them.
		if (!this.credentialsOverwrites.supportsManagedAuth(type)) return tokenData;

		const storedData = await credentials.getData();
		if (hasTokenData(storedData)) return tokenData;

		const version = this.credentialsOverwrites.getNewConnectionVersion(type, storedData);
		return version === undefined ? tokenData : { ...tokenData, [MANAGED_VERSION_KEY]: version };
	}
}

export function createCredentialsFromCredentialsEntity(
	credential: ICredentialsDb,
	encrypt = false,
): Credentials {
	const { id, name, type, data } = credential;
	if (encrypt) {
		return new Credentials({ id: null, name }, type);
	}
	return new Credentials({ id, name }, type, data);
}
