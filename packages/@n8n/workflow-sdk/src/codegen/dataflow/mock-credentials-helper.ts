/**
 * Lightweight mock ICredentialsHelper for execution tests.
 * Returns pre-defined credential data by type so HTTP nodes can authenticate
 * against nock interceptors.
 */

import { ICredentialsHelper } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeProperties,
	IRequestOptionsSimplified,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

const DEFAULT_CREDENTIALS: Record<string, ICredentialDataDecryptedObject> = {
	httpHeaderAuth: { name: 'Authorization', value: 'Bearer test-token' },
	httpBasicAuth: { user: 'test-user', password: 'test-pass' },
	httpDigestAuth: { user: 'test-user', password: 'test-pass' },
	httpQueryAuth: { name: 'api_key', value: 'test-key' },
	oAuth2Api: {
		grantType: 'authorizationCode',
		oauthTokenData: {
			access_token: 'test-oauth2-token',
			token_type: 'Bearer',
		},
		clientId: 'test-id',
		clientSecret: 'test-secret',
		accessTokenUrl: 'https://example.com/oauth/token',
	},
	oAuth1Api: {
		consumerKey: 'test-key',
		consumerSecret: 'test-secret',
		signatureMethod: 'HMAC-SHA1',
		oauthTokenData: { oauth_token: 'test', oauth_token_secret: 'test' },
	},
};

export class MockCredentialsHelper extends ICredentialsHelper {
	getParentTypes(_name: string): string[] {
		return [];
	}

	async authenticate(
		_credentials: ICredentialDataDecryptedObject,
		_typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		_workflow: Workflow,
		_node: INode,
	): Promise<IHttpRequestOptions> {
		return requestOptions as IHttpRequestOptions;
	}

	async preAuthentication(
		_helpers: IHttpRequestHelper,
		_credentials: ICredentialDataDecryptedObject,
		_typeName: string,
		_node: INode,
		_credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return undefined;
	}

	async getCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
	): Promise<ICredentials> {
		throw new Error('MockCredentialsHelper.getCredentials not supported');
	}

	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
		..._rest: unknown[]
	): Promise<ICredentialDataDecryptedObject> {
		return DEFAULT_CREDENTIALS[type] ?? {};
	}

	async updateCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
		_data: ICredentialDataDecryptedObject,
	): Promise<void> {}

	async updateCredentialsOauthTokenData(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
		_data: ICredentialDataDecryptedObject,
		_additionalData: IWorkflowExecuteAdditionalData,
	): Promise<void> {}

	getCredentialsProperties(_type: string): INodeProperties[] {
		return [];
	}
}
