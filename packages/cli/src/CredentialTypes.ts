import {
	ICredentialType,
	ICredentialTypes as ICredentialTypesInterface,
} from 'n8n-workflow';

import {
	CredentialsOverwrites,
	ICredentialsTypeData,
} from './';

class CredentialTypesClass implements ICredentialTypesInterface {

	credentialTypes: ICredentialsTypeData = {};


	async init(credentialTypes: ICredentialsTypeData): Promise<void> {
		this.credentialTypes = credentialTypes;

		// Load the credentials overwrites if any exist
		const credentialsOverwrites = CredentialsOverwrites().getAll();

		for (const credentialType of Object.keys(credentialsOverwrites)) {
			if (credentialTypes[credentialType] === undefined) {
				continue;
			}

			// Add which properties got overwritten that the Editor-UI knows
			// which properties it should hide
			credentialTypes[credentialType].__overwrittenProperties = Object.keys(credentialsOverwrites[credentialType]);
		}
	}

	getAll(): ICredentialType[] {
		return Object.values(this.credentialTypes);
	}

	getByName(credentialType: string): ICredentialType {
		return this.credentialTypes[credentialType];
	}
}



let credentialTypesInstance: CredentialTypesClass | undefined;

export function CredentialTypes(): CredentialTypesClass {
	if (credentialTypesInstance === undefined) {
		credentialTypesInstance = new CredentialTypesClass();
	}

	return credentialTypesInstance;
}
