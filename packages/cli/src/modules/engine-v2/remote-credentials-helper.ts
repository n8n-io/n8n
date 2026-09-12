import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsExpressionResolveValues,
	ICredentialTypes,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeProperties,
	IRequestOptionsSimplified,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ICredentialsHelper, UnexpectedError } from 'n8n-workflow';

import type { EngineCredentialsClient } from './engine-credentials-client';
import type { ResolveCredentialRequest } from './engine-credentials.contract';

/**
 * The `ICredentialsHelper` that the engine 2.0 data plane gives to v1 nodes.
 *
 * The data plane has no credential store and no encryption key. Reads go to
 * the control plane over HTTP. Methods that only need the credential type
 * definitions delegate to the in-process `CredentialsHelper`. Methods that
 * write to the credential store throw, so an unsupported path fails in the
 * step that uses it instead of failing silently or writing from the data plane.
 *
 * One instance per execution: the constructor context names the execution the
 * requests are for.
 *
 * Known limitation: the control plane resolves credential expressions without
 * the execution data of the step. A credential field that reads `$vars`,
 * `$secrets` or `$env` resolves as in v1. A field that reads execution data,
 * such as `$json`, `$input` or another node's output, resolves without it.
 * Sending the resolve context to the control plane is tracked in CAT-4532.
 */
export class RemoteCredentialsHelper extends ICredentialsHelper {
	constructor(
		private readonly client: EngineCredentialsClient,
		private readonly delegate: ICredentialsHelper,
		private readonly credentialTypes: ICredentialTypes,
		private readonly context: AdditionalDataContext,
		// Every request of this execution uses this one signal. The engine has no
		// per-step cancellation signal yet. TODO(CAT-4526): pass the step signal.
		private readonly signal: AbortSignal,
	) {
		super();
	}

	/**
	 * Asks the control plane for the decrypted data. The control plane applies
	 * overwrites, resolves expressions and runs the policy check, so `raw` and
	 * `expressionResolveValues` are not sent. The request has no `raw` flag.
	 */
	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		_mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): Promise<ICredentialDataDecryptedObject> {
		if (nodeCredentials.__aiGatewayManaged) {
			throw new UnexpectedError('Gateway credits are not supported on Engine 2.0', {
				tags: { credentialType: type },
			});
		}

		if (!nodeCredentials.id) {
			throw new UnexpectedError('Found credential with no ID.', {
				extra: { credentialName: nodeCredentials.name },
				tags: { credentialType: type },
			});
		}

		// Same precedence as `CredentialsHelper.getDecrypted`: a sub-node inherits
		// `executeData.node` from its parent, so the node in
		// `expressionResolveValues` is the one that asks for the credential.
		const consumerNode = expressionResolveValues?.node ?? executeData?.node;

		// The OAuth2 token refresh in core is the one caller that reads the raw
		// data with no node: it re-reads the stored token before it writes the
		// refreshed one, and that write throws below. Fail here with the same
		// error, so the step reports the unsupported refresh and not a missing node.
		if (!consumerNode && raw === true) {
			throw this.oauthRefreshUnsupported(type);
		}

		if (!consumerNode) {
			throw new UnexpectedError(
				'Engine 2.0 cannot resolve a credential without the node that uses it',
				{
					tags: { credentialType: type },
				},
			);
		}

		const request: ResolveCredentialRequest = {
			credential: { id: nodeCredentials.id, name: nodeCredentials.name, type },
			execution: {
				executionId: this.context.executionId,
				workflowId: this.context.workflowId,
				mode: this.context.mode,
			},
			context: { userId: this.context.userId, projectId: this.context.projectId },
			consumer: { nodeType: consumerNode.type },
		};

		return await this.client.resolve(request, this.signal);
	}

	/**
	 * The delegate writes a refreshed value of an expirable property to the
	 * credential store, which the data plane cannot do. A credential type with
	 * no expirable property never writes, so the delegate runs for it.
	 */
	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (this.hasExpirableProperty(typeName)) {
			throw new UnexpectedError(
				'Engine 2.0 does not support credentials with an expirable property yet',
				{ tags: { credentialType: typeName } },
			);
		}

		return await this.delegate.preAuthentication(
			helpers,
			credentials,
			typeName,
			node,
			credentialsExpired,
		);
	}

	private hasExpirableProperty(typeName: string): boolean {
		return this.credentialTypes
			.getByName(typeName)
			.properties.some(
				(property) => property.type === 'hidden' && property.typeOptions?.expirable === true,
			);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async updateCredentialsOauthTokenData(
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
		_data: ICredentialDataDecryptedObject,
		_additionalData: IWorkflowExecuteAdditionalData,
	): Promise<void> {
		throw this.oauthRefreshUnsupported(type);
	}

	private oauthRefreshUnsupported(type: string): UnexpectedError {
		return new UnexpectedError('Engine 2.0 does not support OAuth token refresh yet', {
			tags: { credentialType: type },
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials> {
		throw new UnexpectedError('Engine 2.0 cannot read the credential store', {
			tags: { credentialType: type },
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async updateCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
		_data: ICredentialDataDecryptedObject,
	): Promise<void> {
		throw new UnexpectedError('Engine 2.0 cannot write to the credential store', {
			tags: { credentialType: type },
		});
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		return await this.delegate.authenticate(credentials, typeName, requestOptions, workflow, node);
	}

	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return await this.delegate.runPreAuthentication(helpers, credentials, typeName);
	}

	getParentTypes(name: string): string[] {
		return this.delegate.getParentTypes(name);
	}

	isCredentialUsableByNode(credentialType: string, nodeType: string): boolean {
		return this.delegate.isCredentialUsableByNode(credentialType, nodeType);
	}

	getCredentialsProperties(type: string): INodeProperties[] {
		return this.delegate.getCredentialsProperties(type);
	}
}
