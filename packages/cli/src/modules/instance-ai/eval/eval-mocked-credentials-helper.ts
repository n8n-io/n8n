import type {
	InstanceAiEvalMockedCredential,
	InstanceAiEvalRewrittenCredential,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsExpressionResolveValues,
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
import { ICredentialsHelper } from 'n8n-workflow';

import { CredentialNotFoundError } from '@/errors/credential-not-found.error';

const MOCK_MARKER = '__evalMockedCredential' as const;

/**
 * Maps credential type → the property on the decrypted credential that holds
 * the vendor base URL. When the eval wire server is running, the matched
 * property gets rewritten so the vendor SDK posts to the local server.
 *
 * Only OpenAI for now — Anthropic, Azure, OpenAI-compat providers, embeddings,
 * vector stores land in the Tier 1–3 follow-up tickets after TRUST-115.
 */
const EVAL_PROVIDER_URL_FIELD: Record<string, string> = {
	openAiApi: 'url',
};

/**
 * CredentialsHelper proxy for evaluation runs. Delegates everything to the
 * wrapped real helper, except:
 *
 *   - `getDecrypted`: when a credential ID cannot be resolved, returns a
 *     marker-only payload instead of throwing. This stops the credential
 *     lookup from halting the workflow before the LLM mock layer can run.
 *
 *   - `authenticate` / `preAuthentication` / `runPreAuthentication`: when
 *     called with a marker payload, return the input unchanged so the
 *     unauthed request flows into `helpers.httpRequest`, where the LLM
 *     mock handler intercepts and synthesizes a response.
 *
 * Eval-mode HTTP never reaches real services, so credential data shape is
 * irrelevant — the only contract we preserve is that the auth path doesn't
 * throw on missing data.
 */
export class EvalMockedCredentialsHelper extends ICredentialsHelper {
	readonly mockedCredentials: InstanceAiEvalMockedCredential[] = [];
	readonly rewrittenCredentials: InstanceAiEvalRewrittenCredential[] = [];

	/**
	 * @param inner The real credentials helper to delegate to.
	 * @param serverUrl Optional base URL of the running eval wire server. When
	 *   set, decrypted credentials of a type listed in `EVAL_PROVIDER_URL_FIELD`
	 *   get their URL field rewritten to this value (copy-on-write), so the
	 *   vendor SDK posts to the wire server instead of the real provider.
	 *   Leaving this undefined keeps the helper's pre-rewrite behaviour for
	 *   callers that don't opt into the unpin path.
	 * @param logger Optional logger. When provided, the helper warns on each
	 *   resolved credential whose type is unmapped (so unmapped HTTP providers
	 *   like Anthropic don't silently escape interception). Optional so this
	 *   helper stays usable in tests/sites that don't construct it from DI.
	 */
	constructor(
		private readonly inner: ICredentialsHelper,
		private readonly serverUrl?: string,
		private readonly logger?: Logger,
	) {
		super();
	}

	getParentTypes(name: string): string[] {
		return this.inner.getParentTypes(name);
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow: Workflow,
		node: INode,
	): Promise<IHttpRequestOptions> {
		if (credentials[MOCK_MARKER] === true) {
			return requestOptions as IHttpRequestOptions;
		}
		return await this.inner.authenticate(credentials, typeName, requestOptions, workflow, node);
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (credentials[MOCK_MARKER] === true) return credentials;
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
		if (credentials[MOCK_MARKER] === true) return credentials;
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
	): Promise<ICredentialDataDecryptedObject> {
		let credentials: ICredentialDataDecryptedObject;
		try {
			credentials = await this.inner.getDecrypted(
				additionalData,
				nodeCredentials,
				type,
				mode,
				executeData,
				raw,
				expressionResolveValues,
			);
		} catch (error) {
			if (!(error instanceof CredentialNotFoundError)) throw error;

			this.mockedCredentials.push({
				nodeName: executeData?.node?.name ?? 'unknown',
				credentialType: type,
				credentialId: nodeCredentials.id ?? undefined,
			});

			credentials = { [MOCK_MARKER]: true };
		}

		return this.applyServerUrlRewrite(credentials, type, nodeCredentials, executeData);
	}

	/**
	 * Routes the vendor base URL on the resolved credential to the eval wire
	 * server. Copy-on-write — never mutates the caller's object — and records
	 * the rewrite on `rewrittenCredentials` so the eval result can surface it.
	 * No-op when `serverUrl` is unset or the credential type isn't in the
	 * provider map; this is what keeps the existing (non-unpin) eval path
	 * unchanged.
	 */
	private applyServerUrlRewrite(
		credentials: ICredentialDataDecryptedObject,
		type: string,
		nodeCredentials: INodeCredentialsDetails,
		executeData: IExecuteData | undefined,
	): ICredentialDataDecryptedObject {
		if (!this.serverUrl) return credentials;
		const field = EVAL_PROVIDER_URL_FIELD[type];
		if (!field) {
			// Wire server is up (caller opted in) but this credential type has no
			// URL field mapping yet. The vendor SDK will use its built-in default
			// URL, which means traffic for this provider escapes interception and
			// hits the real API. Surface this loudly so the gap is visible until
			// the Tier 1 follow-up tickets extend `EVAL_PROVIDER_URL_FIELD`.
			this.logger?.warn(
				`[EvalMock] No URL rewrite mapping for credential type "${type}" — ` +
					`vendor traffic from "${executeData?.node?.name ?? 'unknown'}" will hit the real provider.`,
			);
			return credentials;
		}

		this.rewrittenCredentials.push({
			nodeName: executeData?.node?.name ?? 'unknown',
			credentialType: type,
			credentialId: nodeCredentials.id ?? undefined,
			field,
		});

		return { ...credentials, [field]: this.serverUrl };
	}

	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {
		return await this.inner.updateCredentials(nodeCredentials, type, data);
	}

	async updateCredentialsOauthTokenData(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<void> {
		return await this.inner.updateCredentialsOauthTokenData(
			nodeCredentials,
			type,
			data,
			additionalData,
		);
	}

	getCredentialsProperties(type: string): INodeProperties[] {
		return this.inner.getCredentialsProperties(type);
	}
}
