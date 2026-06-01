import { isObjectLiteral } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, ICredentialsEncrypted } from 'n8n-workflow';
import { ApplicationError, ICredentials, jsonParse } from 'n8n-workflow';
import * as a from 'node:assert';

import { CREDENTIAL_ERRORS } from '@/constants';
import { Cipher } from '@/encryption/cipher';

export class CredentialDataError extends ApplicationError {
	constructor({ name, type, id }: Credentials<object>, message: string, cause?: unknown) {
		super(message, {
			extra: { name, type, id },
			cause,
		});
	}
}

export class Credentials<
	T extends object = ICredentialDataDecryptedObject,
> extends ICredentials<T> {
	private readonly cipher = Container.get(Cipher);

	/**
	 * Sets new credential object
	 */
	async setData(data: T): Promise<void> {
		a.ok(isObjectLiteral(data));

		this.data = await this.cipher.encryptV2(data);
	}

	/**
	 * Update parts of the credential data.
	 * This decrypts the data, modifies it, and then re-encrypts the updated data back to a string.
	 */
	async updateData(toUpdate: Partial<T>, toDelete: Array<keyof T> = []): Promise<void> {
		const updatedData: T = { ...(await this.getData()), ...toUpdate };
		for (const key of toDelete) {
			delete updatedData[key];
		}
		await this.setData(updatedData);
	}

	/**
	 * Returns the decrypted credential object
	 */
	async getData(): Promise<T> {
		if (this.data === undefined) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.NO_DATA);
		}

		let decryptedData: string;
		try {
			decryptedData = await this.cipher.decryptV2(this.data);
		} catch (cause) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.DECRYPTION_FAILED, cause);
		}

		let parsed: T;
		try {
			parsed = jsonParse(decryptedData);
		} catch (cause) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.INVALID_JSON, cause);
		}
		return parsed;
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
