import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

export interface IStorageEngine<T extends ICredentialDataDecryptedObject> {
	getSecret(credentialId: string, accessToken: string): Promise<T | undefined>;
	setSecret(credentialId: string, data: T, accessToken: string): Promise<void>;
}
