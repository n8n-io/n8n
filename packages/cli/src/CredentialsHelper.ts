import {
	Credentials,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	INodeParameters,
	NodeHelpers,
} from 'n8n-workflow';

import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ICredentialsDb,
} from './';


export class CredentialsHelper extends ICredentialsHelper {

	/**
	 * Returns the credentials instance
	 *
	 * @param {string} name Name of the credentials to return instance of
	 * @param {string} type Type of the credentials to return instance of
	 * @returns {Credentials}
	 * @memberof CredentialsHelper
	 */
	getCredentials(name: string, type: string): Credentials {
		if (!this.workflowCredentials[type]) {
			throw new Error(`No credentials of type "${type}" exist.`);
		}
		if (!this.workflowCredentials[type][name]) {
			throw new Error(`No credentials with name "${name}" exist for type "${type}".`);
		}
		const credentialData = this.workflowCredentials[type][name];

		return new Credentials(credentialData.name, credentialData.type, credentialData.nodesAccess, credentialData.data);
	}


	/**
	 * Returns the decrypted credential data with applied overwrites
	 *
	 * @param {string} name Name of the credentials to return data of
	 * @param {string} type Type of the credentials to return data of
	 * @param {boolean} [raw] Return the data as supplied without defaults or overwrites
	 * @returns {ICredentialDataDecryptedObject}
	 * @memberof CredentialsHelper
	 */
	getDecrypted(name: string, type: string, raw?: boolean): ICredentialDataDecryptedObject {
		const credentials = this.getCredentials(name, type);

		const decryptedDataOriginal = credentials.getData(this.encryptionKey);

		if (raw === true) {
			return decryptedDataOriginal;
		}

		return this.applyDefaultsAndOverwrites(decryptedDataOriginal, type);
	}


	/**
	 * Applies credential default data and overwrites
	 *
	 * @param {ICredentialDataDecryptedObject} decryptedDataOriginal The credential data to overwrite data on
	 * @param {string} type  Type of the credentials to overwrite data of
	 * @returns {ICredentialDataDecryptedObject}
	 * @memberof CredentialsHelper
	 */
	applyDefaultsAndOverwrites(decryptedDataOriginal: ICredentialDataDecryptedObject, type: string): ICredentialDataDecryptedObject {
		const credentialTypes = CredentialTypes();
		const credentialType = credentialTypes.getByName(type);

		if (credentialType === undefined) {
			throw new Error(`The credential type "${type}" is not known and can so not be decrypted.`);
		}

		// Add the default credential values
		const decryptedData = NodeHelpers.getNodeParameters(credentialType.properties, decryptedDataOriginal as INodeParameters, true, false) as ICredentialDataDecryptedObject;

		if (decryptedDataOriginal.oauthTokenData !== undefined) {
			// The OAuth data gets removed as it is not defined specifically as a parameter
			// on the credentials so add it back in case it was set
			decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
		}

		// Load and apply the credentials overwrites if any exist
		const credentialsOverwrites = CredentialsOverwrites();
		return credentialsOverwrites.applyOverwrite(type, decryptedData);
	}


	/**
	 * Updates credentials in the database
	 *
	 * @param {string} name Name of the credentials to set data of
	 * @param {string} type Type of the credentials to set data of
	 * @param {ICredentialDataDecryptedObject} data The data to set
	 * @returns {Promise<void>}
	 * @memberof CredentialsHelper
	 */
	async updateCredentials(name: string, type: string, data: ICredentialDataDecryptedObject): Promise<void> {
		const credentials = await this.getCredentials(name, type);

		if (Db.collections!.Credentials === null) {
			// The first time executeWorkflow gets called the Database has
			// to get initialized first
			await Db.init();
		}

		credentials.setData(data, this.encryptionKey);
		const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialsData.updatedAt = new Date();

		// TODO: also add user automatically depending on who is logged in, if anybody is logged in

		// Save the credentials in DB
		const findQuery = {
			name,
			type,
		};

		await Db.collections.Credentials!.update(findQuery, newCredentialsData);
	}

}
