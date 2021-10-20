import { ICredentialType, ICredentialTypes as ICredentialTypesInterface } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import { CredentialsOverwrites, ICredentialsTypeData } from '.';

class CredentialTypesClass implements ICredentialTypesInterface {
	credentialTypes: ICredentialsTypeData = {};

	async init(credentialTypes: ICredentialsTypeData): Promise<void> {
		this.credentialTypes = credentialTypes;

		// Load the credentials overwrites if any exist
		const credentialsOverwrites = CredentialsOverwrites().getAll();

		// eslint-disable-next-line no-restricted-syntax
		for (const credentialType of Object.keys(credentialsOverwrites)) {
			if (credentialTypes[credentialType] === undefined) {
				// eslint-disable-next-line no-continue
				continue;
			}

			// Add which properties got overwritten that the Editor-UI knows
			// which properties it should hide
			// eslint-disable-next-line no-underscore-dangle, no-param-reassign
			credentialTypes[credentialType].__overwrittenProperties = Object.keys(
				credentialsOverwrites[credentialType],
			);
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CredentialTypes(): CredentialTypesClass {
	if (credentialTypesInstance === undefined) {
		credentialTypesInstance = new CredentialTypesClass();
	}

	return credentialTypesInstance;
}
