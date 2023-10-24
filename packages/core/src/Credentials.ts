import { Container } from 'typedi';
import type { ICredentialDataDecryptedObject, ICredentialsEncrypted } from 'n8n-workflow';
import { ICredentials, jsonParse } from 'n8n-workflow';
import { Cipher } from './Cipher';

export class Credentials extends ICredentials {
	private readonly cipher = Container.get(Cipher);

	/**
	 * Returns if the given nodeType has access to data
	 */
	hasNodeAccess(nodeType: string): boolean {
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
	setData(data: ICredentialDataDecryptedObject): void {
		this.data = this.cipher.encrypt(data);
	}

	/**
	 * Returns the decrypted credential object
	 */
	getData(nodeType?: string): ICredentialDataDecryptedObject {
		if (nodeType && !this.hasNodeAccess(nodeType)) {
			throw new Error(
				`The node of type "${nodeType}" does not have access to credentials "${this.name}" of type "${this.type}".`,
			);
		}

		if (this.data === undefined) {
			throw new Error('No data is set so nothing can be returned.');
		}

		const decryptedData = this.cipher.decrypt(this.data);

		try {
			return jsonParse(decryptedData);
		} catch (e) {
			throw new Error(
				'Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
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
