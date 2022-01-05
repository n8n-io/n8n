import { ICredentialType, ICredentialTypes as ICredentialTypesInterface } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import { ICredentialsTypeData } from '.';

class CredentialTypesClass implements ICredentialTypesInterface {
	credentialTypes: ICredentialsTypeData = {};

	async init(credentialTypes: ICredentialsTypeData): Promise<void> {
		this.credentialTypes = credentialTypes;
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
