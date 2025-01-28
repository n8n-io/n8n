import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, ICredentialsEncrypted } from 'n8n-workflow';
import { ApplicationError, ICredentials, jsonParse } from 'n8n-workflow';
import * as a from 'node:assert';

import { CREDENTIAL_ERRORS } from '@/constants';
import { Cipher } from '@/encryption/cipher';
import { isObjectLiteral } from '@/utils';

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
	setData(data: T): void {
		const stringified = this.stringifyAndValidate(data);

		this.data = this.cipher.encrypt(stringified);
	}

	/**
	 * Returns the decrypted credential object
	 */
	getData(): T {
		if (this.data === undefined) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.NO_DATA);
		}

		let decryptedData: string;
		try {
			decryptedData = this.cipher.decrypt(this.data);
		} catch (cause) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.DECRYPTION_FAILED, cause);
		}

		try {
			return jsonParse(decryptedData);
		} catch (cause) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.INVALID_JSON, cause);
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

	/**
	 * Stringifies the data and makes sure it's a valid JSON object
	 */
	private stringifyAndValidate(data: T) {
		try {
			const stringified = JSON.stringify(data);

			a.equal(isObjectLiteral(JSON.parse(stringified)), true);

			return stringified;
		} catch (cause) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.INVALID_DATA, cause);
		}
	}
}
