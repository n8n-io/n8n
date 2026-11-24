import type { CredentialResult, Tenant } from '@n8n/ai-gym';
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

const SIMULATED_MARKER = '__simulationServiceSimulatedCredential' as const;

const TOKEN_FIELD_NAMES = new Set([
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

/**
 * Credentials helper used during simulation-service workflow simulation.
 *
 * When a node already has a real credential configured, it loads the decrypted
 * credential first and keeps its non-secret fields while swapping secret/OAuth2
 * fields to tokens minted by the active simulation `Tenant`. When a node has no
 * configured credential (or decryption is unavailable during simulation), it
 * synthesizes a credential populated with tenant-minted tokens so workflows can
 * be simulated before real credentials are set up.
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
		// sends are attached, using the tenant-accepted token mapped from the real credential.
		return await this.inner.authenticate(credentials, typeName, requestOptions, workflow, node);
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
		additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
		options?: IGetDecryptedCredentialsOptions,
	): Promise<ICredentialDataDecryptedObject> {
		let baseDecrypted: ICredentialDataDecryptedObject = {};
		const hasConfiguredId =
			typeof nodeCredentials?.id === 'string' && nodeCredentials.id.trim().length > 0;

		if (hasConfiguredId) {
			try {
				baseDecrypted = await this.inner.getDecrypted(
					additionalData,
					nodeCredentials,
					type,
					mode,
					executeData,
					raw,
					expressionResolveValues,
					options,
				);
			} catch {
				// Fall back to synthesized credentials when the configured credential
				// cannot be loaded in the simulation environment.
				baseDecrypted = {};
			}
		}

		const vendor = resolveVendorForCredentialType(type);
		const properties = this.getCredentialsProperties(type);

		if (vendor) {
			const minted = await this.mintOnce(vendor);
			if (minted) {
				const mapped = this.applyMintedTokenToCredential(baseDecrypted, properties, minted);
				return {
					...mapped,
					[SIMULATED_MARKER]: true,
				};
			}
		}

		if (Object.keys(baseDecrypted).length > 0) {
			return baseDecrypted;
		}

		return this.buildFallbackSyntheticCredential(properties);
	}

	private async mintOnce(vendor: string): Promise<CredentialResult | undefined> {
		let pending = this.mintedByVendor.get(vendor);
		if (!pending) {
			pending = this.mintAndExchange(vendor);
			this.mintedByVendor.set(vendor, pending);
		}
		try {
			return await pending;
		} catch {
			return undefined;
		}
	}

	private async mintAndExchange(vendor: string): Promise<CredentialResult> {
		let minted: CredentialResult;
		try {
			minted = await this.tenant.mintCredential(vendor);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes('seed') || message.includes('404')) {
				await this.tenant.seed(vendor, {}).catch(() => undefined);
				minted = await this.tenant.mintCredential(vendor);
			} else {
				throw error;
			}
		}
		const record = minted as Record<string, unknown>;
		const hasAccessToken =
			typeof record.token === 'string' || typeof record.access_token === 'string';
		const refreshToken =
			typeof record.refresh_token === 'string' ? record.refresh_token : undefined;
		const tokenUri = typeof record.token_uri === 'string' ? record.token_uri : undefined;
		const clientId = typeof record.client_id === 'string' ? record.client_id : undefined;
		const clientSecret =
			typeof record.client_secret === 'string' ? record.client_secret : undefined;

		// OAuth2 vendors like Gmail mint a refresh_token + token_uri instead of a direct access_token.
		// Exchange it through the in-process gym tenant so the returned credential has a valid bearer token.
		if (!hasAccessToken && refreshToken && tokenUri) {
			try {
				const form = new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: refreshToken,
					...(clientId ? { client_id: clientId } : {}),
					...(clientSecret ? { client_secret: clientSecret } : {}),
				});
				const exchanged = await this.tenant.run(
					{ services: [vendor], unmatched: 'block' },
					async (scope) => {
						const res = await scope.fetch(tokenUri, {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: form.toString(),
						});
						if (!res.ok) return undefined;
						return (await res.json()) as Record<string, unknown>;
					},
				);
				if (exchanged && typeof exchanged.access_token === 'string') {
					return {
						...minted,
						token: exchanged.access_token,
					};
				}
			} catch {
				// Fall through with the raw minted payload if exchange is unsupported.
			}
		}

		return minted;
	}

	/**
	 * Starts from credential property defaults plus any non-secret fields from the
	 * user's real credential (base URLs, regions, custom scopes, usernames, etc.),
	 * then populates auth token fields with the tenant-accepted token so simulated
	 * vendors authenticate both configured and unconfigured nodes cleanly.
	 */
	private applyMintedTokenToCredential(
		baseDecrypted: ICredentialDataDecryptedObject,
		properties: INodeProperties[],
		minted: CredentialResult,
	): ICredentialDataDecryptedObject {
		const result: ICredentialDataDecryptedObject = {};
		for (const prop of properties) {
			if (
				typeof prop.default === 'string' ||
				typeof prop.default === 'number' ||
				typeof prop.default === 'boolean'
			) {
				if (prop.default !== '') {
					result[prop.name] = prop.default;
				}
			}
		}
		Object.assign(result, baseDecrypted);

		const mintedRecord = minted as Record<string, unknown>;
		const token =
			(typeof mintedRecord.token === 'string' && mintedRecord.token) ||
			(typeof mintedRecord.access_token === 'string' && mintedRecord.access_token) ||
			(typeof mintedRecord.api_key === 'string' && mintedRecord.api_key) ||
			undefined;

		const refreshToken =
			typeof mintedRecord.refresh_token === 'string' ? mintedRecord.refresh_token : undefined;
		const clientId =
			typeof mintedRecord.client_id === 'string' ? mintedRecord.client_id : undefined;
		const clientSecret =
			typeof mintedRecord.client_secret === 'string' ? mintedRecord.client_secret : undefined;
		const tokenUri =
			typeof mintedRecord.token_uri === 'string' ? mintedRecord.token_uri : undefined;
		const authUri = typeof mintedRecord.auth_uri === 'string' ? mintedRecord.auth_uri : undefined;

		if (clientId && properties.some((p) => p.name === 'clientId')) {
			result.clientId = clientId;
		}
		if (clientSecret && properties.some((p) => p.name === 'clientSecret')) {
			result.clientSecret = clientSecret;
		}
		if (tokenUri && properties.some((p) => p.name === 'accessTokenUrl')) {
			result.accessTokenUrl = tokenUri;
		}
		if (authUri && properties.some((p) => p.name === 'authUrl')) {
			result.authUrl = authUri;
		}

		if (token) {
			for (const prop of properties) {
				if (TOKEN_FIELD_NAMES.has(prop.name)) {
					result[prop.name] = token;
				}
			}
			// Also update any token-shaped property already populated on the decrypted object
			// (for credential types that extend parent credentials not listed directly).
			for (const key of Object.keys(result)) {
				if (TOKEN_FIELD_NAMES.has(key) && typeof result[key] === 'string') {
					result[key] = token;
				}
			}
		}

		// OAuth2 credentials store their bearer/refresh tokens under `oauthTokenData`.
		const isOAuth2 =
			(result.oauthTokenData && typeof result.oauthTokenData === 'object') ||
			properties.some((p) => p.name === 'oauthTokenData' || p.name === 'accessTokenUrl');

		if (isOAuth2 && (token || refreshToken)) {
			const existingOAuth =
				result.oauthTokenData && typeof result.oauthTokenData === 'object'
					? (result.oauthTokenData as Record<string, unknown>)
					: {};
			result.oauthTokenData = {
				...existingOAuth,
				...(token ? { access_token: token, token_type: 'Bearer' } : {}),
				...(refreshToken ? { refresh_token: refreshToken } : {}),
			};
		}

		return result;
	}

	private buildFallbackSyntheticCredential(
		properties: INodeProperties[],
	): ICredentialDataDecryptedObject {
		const result: ICredentialDataDecryptedObject = {
			[SIMULATED_MARKER]: true,
		};
		for (const prop of properties) {
			if (TOKEN_FIELD_NAMES.has(prop.name)) {
				result[prop.name] = 'sim-token';
			} else if (
				typeof prop.default === 'string' ||
				typeof prop.default === 'number' ||
				typeof prop.default === 'boolean'
			) {
				result[prop.name] = prop.default;
			}
		}
		if (properties.some((p) => p.name === 'oauthTokenData' || p.name === 'accessTokenUrl')) {
			result.oauthTokenData = {
				access_token: 'sim-token',
				token_type: 'Bearer',
			};
		}
		return result;
	}
}
