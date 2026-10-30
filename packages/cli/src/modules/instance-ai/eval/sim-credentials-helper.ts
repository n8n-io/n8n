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

import { isSimHost } from './sim-egress-proxy';

const BASE_URL_FIELDS = new Set(['url', 'host', 'baseUrl', 'baseURL']);

/** The credential property that holds an API base URL (`url`, `host`, ...), if the type has one. */
export function baseUrlProperty(
	properties: INodeProperties[],
): (INodeProperties & { default: string }) | undefined {
	return properties.find(
		(property): property is INodeProperties & { default: string } =>
			BASE_URL_FIELDS.has(property.name) &&
			typeof property.default === 'string' &&
			/^https?:\/\//.test(property.default),
	);
}

/**
 * Credentials for a simulated-services eval run. The run's credentials are real n8n
 * credentials that hold what the sim server issued, so everything resolves as in
 * production. One change: a credential whose base URL is a host the sim server serves
 * gets that URL pointed at the run's egress proxy. Vendor SDKs (AI sub-nodes) send
 * their own requests, not through n8n's request helpers, so the base URL is the one
 * place to route them; helper-based nodes reach the proxy either way.
 */
export class SimCredentialsHelper extends ICredentialsHelper {
	constructor(
		private readonly inner: ICredentialsHelper,
		private readonly proxyUrl: string,
		private readonly simHosts: readonly string[],
	) {
		super();
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
		const credentials = await this.inner.getDecrypted(
			additionalData,
			nodeCredentials,
			type,
			mode,
			executeData,
			raw,
			expressionResolveValues,
			options,
		);
		const field = baseUrlProperty(this.inner.getCredentialsProperties(type));
		if (!field) return credentials;
		const current = credentials[field.name];
		const target = new URL(typeof current === 'string' && current ? current : field.default);
		if (!isSimHost(target.hostname, this.simHosts)) return credentials;
		// `https://api.openai.com/v1` becomes `<proxy>/sim/api.openai.com/v1`.
		const path = target.pathname.replace(/\/$/, '');
		return { ...credentials, [field.name]: `${this.proxyUrl}/sim/${target.host}${path}` };
	}

	getParentTypes(name: string): string[] {
		return this.inner.getParentTypes(name);
	}

	isCredentialUsableByNode(credentialType: string, nodeType: string): boolean {
		return this.inner.isCredentialUsableByNode(credentialType, nodeType);
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		return await this.inner.authenticate(credentials, typeName, requestOptions, workflow, node);
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
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
		return await this.inner.runPreAuthentication(helpers, credentials, typeName);
	}

	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials> {
		return await this.inner.getCredentials(nodeCredentials, type);
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
