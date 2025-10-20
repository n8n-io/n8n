import { Service } from '@n8n/di';
import { Credentials } from 'n8n-core';
import { ICredentialDataDecryptedObject, IRunExecutionData } from 'n8n-workflow';

export interface ICredentialsResolverService {
	findCredentialData(
		credential: Credentials<ICredentialDataDecryptedObject>,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		workflowRunData: IRunExecutionData,
	): Promise<ICredentialDataDecryptedObject | undefined>;

	isResolveable(credential: ICredentialDataDecryptedObject): boolean;
	makeResolveable(credential: ICredentialDataDecryptedObject): ICredentialDataDecryptedObject;
	storeCredentialData(
		credentialId: string,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		newDecryptedData: ICredentialDataDecryptedObject,
		accessToken: string,
	): Promise<void>;
}

@Service()
export class CredentialsResolverProxyService implements ICredentialsResolverService {
	private credentialsResolverService: ICredentialsResolverService | null = null;

	constructor() {
		// Initialize the service
	}

	setCredentialsResolverService(credentialsResolverService: ICredentialsResolverService) {
		this.credentialsResolverService = credentialsResolverService;
	}

	async findCredentialData(
		credential: Credentials<ICredentialDataDecryptedObject>,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		workflowRunData: IRunExecutionData,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (this.credentialsResolverService === null) {
			return undefined;
		}
		return await this.credentialsResolverService.findCredentialData(
			credential,
			decryptedDataOriginal,
			workflowRunData,
		);
	}

	isResolveable(credential: ICredentialDataDecryptedObject): boolean {
		if (this.credentialsResolverService === null) {
			return false;
		}
		return this.credentialsResolverService.isResolveable(credential);
	}

	makeResolveable(credential: ICredentialDataDecryptedObject): ICredentialDataDecryptedObject {
		if (this.credentialsResolverService === null) {
			return credential;
		}
		return this.credentialsResolverService.makeResolveable(credential);
	}

	async storeCredentialData(
		credentialId: string,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		newDecryptedData: ICredentialDataDecryptedObject,
		accessToken: string,
	): Promise<void> {
		if (this.credentialsResolverService === null) {
			return;
		}
		return await this.credentialsResolverService.storeCredentialData(
			credentialId,
			decryptedDataOriginal,
			newDecryptedData,
			accessToken,
		);
	}
}
