import {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsEncrypted,
} from 'n8n-workflow';

import { AES, enc } from 'crypto-js';

export class Credentials extends ICredentials {
	/**
	 * Returns if the given nodeType has access to data
	 */
	hasNodeAccess(nodeType: string): boolean {
		// eslint-disable-next-line no-restricted-syntax
		for (const accessData of this.nodesAccess) {
			if (accessData.nodeType === nodeType) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Sets new credential object
	 */
	setData(data: ICredentialDataDecryptedObject, encryptionKey: string): void {
		this.data = AES.encrypt(JSON.stringify(data), encryptionKey).toString();
	}

	/**
	 * Sets new credentials for given key
	 */
	setDataKey(key: string, data: CredentialInformation, encryptionKey: string): void {
		let fullData;
		try {
			fullData = this.getData(encryptionKey);
		} catch (e) {
			fullData = {};
		}

		fullData[key] = data;

		return this.setData(fullData, encryptionKey);
	}

	/**
	 * Returns the decrypted credential object
	 */
	getData(encryptionKey: string, nodeType?: string): ICredentialDataDecryptedObject {
		if (nodeType && !this.hasNodeAccess(nodeType)) {
			throw new Error(
				`The node of type "${nodeType}" does not have access to credentials "${this.name}" of type "${this.type}".`,
			);
		}

		if (this.data === undefined) {
			throw new Error('No data is set so nothing can be returned.');
		}

		const decryptedData = AES.decrypt(this.data, encryptionKey);

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return JSON.parse(decryptedData.toString(enc.Utf8));
		} catch (e) {
			throw new Error(
				'Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	/**
	 * Returns the decrypted credentials for given key
	 */
	getDataKey(key: string, encryptionKey: string, nodeType?: string): CredentialInformation {
		const fullData = this.getData(encryptionKey, nodeType);

		if (fullData === null) {
			throw new Error('No data was set.');
		}

		// eslint-disable-next-line no-prototype-builtins
		if (!fullData.hasOwnProperty(key)) {
			throw new Error(`No data for key "${key}" exists.`);
		}

		return fullData[key];
	}

	/**
	 * Returns the encrypted credentials to be saved
	 */
	getDataToSave(): ICredentialsEncrypted {
		if (this.data === undefined) {
			throw new Error('No credentials were set to save.');
		}

		return {
			id: this.id,
			name: this.name,
			type: this.type,
			data: this.data,
			nodesAccess: this.nodesAccess,
		};
	}
}
