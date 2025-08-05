import { Service } from '@n8n/di';
import { ICredentialsHelper } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { Credentials } from '../dist/credentials';
import { CredentialTypes } from './credential-types';

@Service()
export class CredentialsHelper extends ICredentialsHelper {
	private credentialsMap: Record<string, ICredentialDataDecryptedObject> = {};

	constructor(private readonly credentialTypes: CredentialTypes) {
		super();
	}

	setCredentials(credentialsMap: Record<string, ICredentialDataDecryptedObject>) {
		this.credentialsMap = credentialsMap;
	}

	getCredentialsProperties() {
		return [];
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestParams: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentialType = this.credentialTypes.getByName(typeName);
		if (typeof credentialType.authenticate === 'function') {
			return await credentialType.authenticate(credentials, requestParams);
		}
		return requestParams;
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

	getParentTypes(_name: string): string[] {
		return [];
	}

	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentialDataDecryptedObject> {
		return this.credentialsMap[type] ?? {};
	}

	async getCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
	): Promise<Credentials> {
		return new Credentials({ id: null, name: '' }, '', '');
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
	): Promise<void> {}
}
