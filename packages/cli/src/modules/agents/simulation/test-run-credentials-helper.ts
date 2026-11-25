import { UnexpectedError } from '@n8n/errors';
import { buildEvalMockCredentials } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	IRequestOptionsSimplified,
} from 'n8n-workflow';
import { ICredentialsHelper } from 'n8n-workflow';

/**
 * The credentials helper of a test run. Tools get credentials built from the credential type,
 * with placeholders for the secrets, so no real secret can reach a request the simulator sees.
 * Nothing is written back: a simulated token refresh must not change a stored credential.
 */
export class TestRunCredentialsHelper extends ICredentialsHelper {
	constructor(private readonly inner: ICredentialsHelper) {
		super();
	}

	getParentTypes(name: string): string[] {
		return this.inner.getParentTypes(name);
	}

	isCredentialUsableByNode(credentialType: string, nodeType: string): boolean {
		return this.inner.isCredentialUsableByNode(credentialType, nodeType);
	}

	getCredentialsProperties(type: string): INodeProperties[] {
		return this.inner.getCredentialsProperties(type);
	}

	async getDecrypted(
		_additionalData: unknown,
		_nodeCredentials: unknown,
		type: string,
		..._rest: unknown[]
	): Promise<ICredentialDataDecryptedObject> {
		return await Promise.resolve(
			buildEvalMockCredentials(
				this.inner.getCredentialsProperties(type),
			) as ICredentialDataDecryptedObject,
		);
	}

	async getCredentials(): Promise<ICredentials> {
		return await Promise.reject(
			new UnexpectedError('A test run does not read stored credentials.'),
		);
	}

	// The simulator answers before auth would apply, and there is no real secret to apply.
	async authenticate(
		_credentials: ICredentialDataDecryptedObject,
		_typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
	): Promise<IHttpRequestOptions> {
		return await Promise.resolve(requestOptions as IHttpRequestOptions);
	}

	async preAuthentication(
		_helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		_typeName: string,
		_node: INode,
		_credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return await Promise.resolve(credentials);
	}

	async runPreAuthentication(
		_helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		_typeName?: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return await Promise.resolve(credentials);
	}

	async updateCredentials(): Promise<void> {}

	async updateCredentialsOauthTokenData(): Promise<void> {}
}
