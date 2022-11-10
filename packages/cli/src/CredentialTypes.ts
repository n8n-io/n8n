import { Known } from 'n8n-core';
import * as path from 'path';
import { ICredentialType, ICredentialTypeData, ICredentialTypes } from 'n8n-workflow';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { loadClassInIsolation } from './CommunityNodes/helpers';

class CredentialTypesClass implements ICredentialTypes {
	credentialTypes: ICredentialTypeData = {};

	private known: Known['credentials'];

	register(known: Known) {
		this.known = known.credentials;
	}

	async init(credentialTypes: ICredentialTypeData): Promise<void> {
		this.credentialTypes = credentialTypes;
	}

	getAll(): ICredentialType[] {
		return Object.values(this.credentialTypes).map((data) => data.type);
	}

	getCredential(type: string): ICredentialTypeData[string] {
		return this.credentialTypes[type] ?? this.loadCredential(type);
	}

	getByName(credentialType: string): ICredentialType {
		return this.getCredential(credentialType).type;
	}

	private loadCredential(type: string): ICredentialTypeData[string] {
		if (type in this.known) {
			const sourcePath = this.known[type];
			const [name] = path.parse(sourcePath).name.split('.');
			const loaded: ICredentialType = loadClassInIsolation(sourcePath, name);
			this.credentialTypes[type] = {
				sourcePath,
				type: loaded,
			};
			return this.credentialTypes[type];
		}
		throw new Error(`${RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL}: ${type}`);
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
