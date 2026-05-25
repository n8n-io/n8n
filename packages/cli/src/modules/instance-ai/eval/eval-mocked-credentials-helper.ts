import type {
	InstanceAiEvalMockedCredential,
	InstanceAiEvalRewrittenCredential,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { buildEvalMockCredentials } from 'n8n-core';
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

// `pathPrefix` must match what the vendor SDK appends to `baseURL`. OpenAI SDK appends
// `/chat/completions`, so credentials.url must include `/v1` for the wire server route to match.
export const EVAL_PROVIDER_URL_FIELD: Record<string, { field: string; pathPrefix: string }> = {
	openAiApi: { field: 'url', pathPrefix: '/v1' },
};

/** CredentialsHelper proxy for eval: tolerates missing credentials and (optionally) rewrites vendor URLs to the wire server. */
export class EvalMockedCredentialsHelper extends ICredentialsHelper {
	readonly mockedCredentials: InstanceAiEvalMockedCredential[] = [];
	readonly rewrittenCredentials: InstanceAiEvalRewrittenCredential[] = [];

	constructor(
		private readonly inner: ICredentialsHelper,
		private readonly serverUrl?: string,
		private readonly logger?: Logger,
		private readonly subNodeToRoot?: ReadonlyMap<string, string>,
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
	 * Synthesize a credential from its schema and apply the URL rewrite.
	 *
	 * Hook the n8n-core eval-mode bypass calls when a node has no credentials
	 * configured at all. The bypass exists so HTTP-helper-mocked workflows can
	 * run without real keys, but without this hook the bypass would short-
	 * circuit `getDecrypted` and skip our path-based URL rewrite — vendor SDK
	 * traffic would then escape to the real provider with placeholder values
	 * and 401 at the wire layer.
	 *
	 * `n8n-core` invokes this via duck-typing (`'synthesizeAndDecrypt' in
	 * additionalData.credentialsHelper`); see `_getCredentials` in
	 * `node-execution-context.ts`.
	 */
	async synthesizeAndDecrypt(
		type: string,
		executeData?: IExecuteData,
	): Promise<ICredentialDataDecryptedObject> {
		const schema = this.inner.getCredentialsProperties(type);
		// `buildEvalMockCredentials` is typed `Record<string, unknown>` because
		// schema defaults can be richer than `CredentialInformation` (e.g.
		// `INodeParameterResourceLocator`). At runtime the values it emits
		// are all string / boolean / number / JSON-shaped objects — fine for
		// the rewrite path, which only reads + augments the `url` field.
		// Brand it with `MOCK_MARKER` so `authenticate` / `preAuthentication`
		// / `runPreAuthentication` short-circuit to the marker branch instead
		// of delegating synthetic credentials through the inner helper's
		// real-auth flow (OAuth refresh, PreSend hooks, etc.).
		const synthetic = {
			...buildEvalMockCredentials(schema),
			[MOCK_MARKER]: true,
		} as ICredentialDataDecryptedObject;

		this.mockedCredentials.push({
			nodeName: executeData?.node?.name ?? 'unknown',
			credentialType: type,
			credentialId: undefined,
		});

		// No `nodeCredentials.id` exists for a synthesized credential — pass
		// a stub `INodeCredentialsDetails` shape so the existing rewrite
		// branch logs and returns identically to the "real creds resolved" path.
		const syntheticNodeCredentials: INodeCredentialsDetails = { id: null, name: type };
		return this.applyServerUrlRewrite(synthetic, type, syntheticNodeCredentials, executeData);
	}

	private applyServerUrlRewrite(
		credentials: ICredentialDataDecryptedObject,
		type: string,
		nodeCredentials: INodeCredentialsDetails,
		executeData: IExecuteData | undefined,
	): ICredentialDataDecryptedObject {
		if (!this.serverUrl) return credentials;
		const mapping = EVAL_PROVIDER_URL_FIELD[type];
		if (!mapping) {
			// No rewrite mapping — vendor SDK will hit its default URL. Refused upfront
			// by assertUnpinCompatibility for LLM sub-nodes; this branch is for non-LLM HTTP creds.
			this.logger?.warn(
				`[EvalMock] No URL rewrite mapping for credential type "${type}" — ` +
					`vendor traffic from "${executeData?.node?.name ?? 'unknown'}" will hit the real provider.`,
			);
			return credentials;
		}

		const { field, pathPrefix } = mapping;
		const subNodeName = executeData?.node?.name;
		const rootName = subNodeName ? this.subNodeToRoot?.get(subNodeName) : undefined;

		if (subNodeName && !rootName && this.subNodeToRoot) {
			// Sub-node not in routing map — unexpected topology; wire server's
			// unrouted-/v1 handler will surface this loudly too.
			this.logger?.warn(
				`[EvalMock] No vendor LLM routing entry for sub-node "${subNodeName}" — ` +
					'wire-server attribution will be unrouted. Check buildVendorLlmRouting coverage.',
			);
		}

		this.rewrittenCredentials.push({
			nodeName: subNodeName ?? 'unknown',
			credentialType: type,
			credentialId: nodeCredentials.id ?? undefined,
			field,
		});

		const rewrittenUrl = rootName
			? `${this.serverUrl}/eval/${encodeURIComponent(rootName)}${pathPrefix}`
			: `${this.serverUrl}${pathPrefix}`;

		return { ...credentials, [field]: rewrittenUrl };
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
