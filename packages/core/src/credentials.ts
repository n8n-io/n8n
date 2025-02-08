import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, ICredentialsEncrypted } from 'n8n-workflow';
import { ApplicationError, ICredentials, jsonParse } from 'n8n-workflow';
import * as a from 'node:assert';

import { CREDENTIAL_ERRORS } from '@/constants';
import { Cipher } from '@/encryption/cipher';
import { ErrorReporter } from '@/errors/error-reporter';
import { isObjectLiteral } from '@/utils';

export class CredentialDataError extends ApplicationError {
	constructor(
		{ name, type, id }: Credentials<object>,
		message: string,
		cause?: unknown,
		tryAgain?: boolean,
	) {
		super(message, {
			extra: { name, type, id, tryAgain },
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
		a.ok(isObjectLiteral(data));

		this.data = this.cipher.encrypt(data);
	}

	/**
	 * Returns the decrypted credential object
	 */
	getData(): T {
		if (this.data === undefined) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.NO_DATA);
		}

		return this.tryGetData(this.data);
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

	tryGetData(data: string, tryAgain = true): T {
		let decryptedData: string;
		try {
			decryptedData = this.cipher.decrypt(data);
		} catch (cause) {
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.DECRYPTION_FAILED, cause, tryAgain);
		}

		let parsedData: T;
		try {
			parsedData = jsonParse(decryptedData);
		} catch (cause) {
			if (tryAgain) {
				Container.get(ErrorReporter).error(
					new CredentialDataError(this, CREDENTIAL_ERRORS.INVALID_JSON, cause, tryAgain),
					{
						extra: {
							id: this.id,
							name: this.name,
							type: this.type,
							tryAgain,
						},
					},
				);
				return this.tryGetData(decryptedData, false);
			}
			throw new CredentialDataError(this, CREDENTIAL_ERRORS.INVALID_JSON, cause, tryAgain);
		}

		if (!tryAgain) {
			Container.get(ErrorReporter).info('Credential was double encrypted', {
				extra: {
					id: this.id,
					name: this.name,
					type: this.type,
				},
			});
		}

		return parsedData;
	}
}
