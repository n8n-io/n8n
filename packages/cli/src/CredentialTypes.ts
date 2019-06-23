import {
	ICredentialType,
	ICredentialTypes as ICredentialTypesInterface,
} from 'n8n-workflow';


class CredentialTypesClass implements ICredentialTypesInterface {

	credentialTypes: {
		[key: string]: ICredentialType
	} = {};


	async init(credentialTypes: { [key: string]: ICredentialType }): Promise<void> {
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

export function CredentialTypes(): CredentialTypesClass {
	if (credentialTypesInstance === undefined) {
		credentialTypesInstance = new CredentialTypesClass();
	}

	return credentialTypesInstance;
}
