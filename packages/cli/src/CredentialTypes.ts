import {
	ICredentialType,
	ICredentialTypeData,
	ICredentialTypes as ICredentialTypesInterface,
} from 'n8n-workflow';

class CredentialTypesClass implements ICredentialTypesInterface {
	credentialTypes: ICredentialTypeData = {};

	async init(credentialTypes: ICredentialTypeData): Promise<void> {
		this.credentialTypes = credentialTypes;
	}

	getAll(): ICredentialType[] {
		return Object.values(this.credentialTypes).map((data) => data.type);
	}

	getByName(credentialType: string): ICredentialType {
		return this.credentialTypes[credentialType].type;
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
