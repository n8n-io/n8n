import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, ICredentialsEncrypted } from 'n8n-workflow';
import { ApplicationError, ICredentials, jsonParse } from 'n8n-workflow';

import { CREDENTIAL_ERRORS } from '@/constants';
import { Cipher } from '@/encryption/cipher';

export class Credentials<
	T extends object = ICredentialDataDecryptedObject,
> extends ICredentials<T> {
	private readonly cipher = Container.get(Cipher);

	/**
	 * Sets new credential object
	 */
	setData(data: T): void {
		this.data = this.cipher.encrypt(data);
	}

	/**
	 * Returns the decrypted credential object
	 */
	getData(): T {
		if (this.data === undefined) {
			throw new ApplicationError(CREDENTIAL_ERRORS.NO_DATA);
		}

		let decryptedData: string;
		try {
			decryptedData = this.cipher.decrypt(this.data);
		} catch (e) {
			throw new ApplicationError(CREDENTIAL_ERRORS.DECRYPTION_FAILED, { cause: e });
		}

		try {
			return jsonParse(decryptedData);
		} catch (e) {
			throw new ApplicationError(CREDENTIAL_ERRORS.INVALID_JSON, { cause: e });
		}
	}

	/**
	 * Returns the encrypted credentials to be saved
	 */
	getDataToSave(): ICredentialsEncrypted {
		if (this.data === undefined) {
			throw new ApplicationError('No credentials were set to save.');
		}

		return {
			id: this.id,
			name: this.name,
			type: this.type,
			data: this.data,
		};
	}
}
