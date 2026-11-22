import type { CredentialResult, Tenant } from '@n8n/ai-gym';
import { buildEvalMockCredentials } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsExpressionResolveValues,
	IExecuteData,
	IGetDecryptedCredentialsOptions,
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
import { ICredentialsHelper } from 'n8n-workflow';

import { resolveVendorForCredentialType } from './node-support-validator';

const SIMULATED_MARKER = '__aiGymSimulatedCredential' as const;

/**
 * Credentials helper used during ai-gym workflow simulation.
 *
 * Always synthesizes credentials using tokens minted from the active ai-gym `Tenant`
 * so real user secrets are never loaded or sent during simulation.
 */
export class SimulationCredentialsHelper extends ICredentialsHelper {
	private readonly mintedByVendor = new Map<string, Promise<CredentialResult>>();

	constructor(
		private readonly inner: ICredentialsHelper,
		private readonly tenant: Tenant,
	) {
		super();
	}

	getParentTypes(name: string): string[] {
		return this.inner.getParentTypes(name);
	}

	getCredentialsProperties(type: string): INodeProperties[] {
		return this.inner.getCredentialsProperties(type);
	}

	isCredentialUsableByNode(type: string, nodeType: string): boolean {
		return this.inner.isCredentialUsableByNode(type, nodeType);
	}

	async updateCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
		_data: ICredentialDataDecryptedObject,
	): Promise<void> {
		// No-op during simulation: never persist mutated credentials.
	}

	async updateCredentialsOauthTokenData(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
		_tokenData: ICredentialDataDecryptedObject,
	): Promise<void> {
		// No-op during simulation: never persist refreshed OAuth tokens.
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow: Workflow,
		node: INode,
	): Promise<IHttpRequestOptions> {
		// Delegate to the real authenticate so the exact headers/query params that production
		// sends are attached — using our minted ai-gym token in `credentials`.
		try {
			return await this.inner.authenticate(credentials, typeName, requestOptions, workflow, node);
		} catch {
			return requestOptions as IHttpRequestOptions;
		}
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (credentials[SIMULATED_MARKER] === true) {
			return credentials;
		}
		return await this.inner.preAuthentication(
			helpers,
			credentials,
			typeName,
			node,
			credentialsExpired,
		);
	}

	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (credentials[SIMULATED_MARKER] === true) {
			return credentials;
		}
		return await this.inner.runPreAuthentication(helpers, credentials, typeName);
	}

	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials> {
		return await this.inner.getCredentials(nodeCredentials, type);
	}

	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
		_mode: WorkflowExecuteMode,
		_executeData?: IExecuteData,
		_raw?: boolean,
		_expressionResolveValues?: ICredentialsExpressionResolveValues,
		_options?: IGetDecryptedCredentialsOptions,
	): Promise<ICredentialDataDecryptedObject> {
		const properties = this.getCredentialsProperties(type);
		const base = buildEvalMockCredentials(properties) as ICredentialDataDecryptedObject;
		const vendor = resolveVendorForCredentialType(type);

		let minted: CredentialResult | undefined;
		if (vendor) {
			minted = await this.mintOnce(vendor);
		}

		const populated = this.applyMintedToken(base, properties, minted);
		return {
			...populated,
			[SIMULATED_MARKER]: true,
		};
	}

	private async mintOnce(vendor: string): Promise<CredentialResult | undefined> {
		let pending = this.mintedByVendor.get(vendor);
		if (!pending) {
			pending = this.tenant.mintCredential(vendor);
			this.mintedByVendor.set(vendor, pending);
		}
		try {
			return await pending;
		} catch {
			return undefined;
		}
	}

	private applyMintedToken(
		base: ICredentialDataDecryptedObject,
		properties: INodeProperties[],
		minted: CredentialResult | undefined,
	): ICredentialDataDecryptedObject {
		const result: ICredentialDataDecryptedObject = { ...base };
		if (!minted?.token) {
			return result;
		}

		const token = minted.token;
		const tokenFieldNames = new Set([
			'accessToken',
			'apiKey',
			'apiToken',
			'token',
			'botToken',
			'secretKey',
			'privateKey',
			'personalAccessToken',
			'password',
		]);

		for (const prop of properties) {
			if (tokenFieldNames.has(prop.name)) {
				result[prop.name] = token;
			}
		}

		// OAuth2 credentials store their bearer token under `oauthTokenData.access_token`.
		const existingOAuth = result.oauthTokenData;
		if (existingOAuth && typeof existingOAuth === 'object') {
			result.oauthTokenData = {
				...(existingOAuth as Record<string, unknown>),
				access_token: token,
				token_type: 'Bearer',
			};
		} else if (properties.some((p) => p.name === 'oauthTokenData' || p.name === 'accessTokenUrl')) {
			result.oauthTokenData = {
				access_token: token,
				token_type: 'Bearer',
			};
		}

		return result;
	}
}
