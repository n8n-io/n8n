import { loadClassInIsolation } from 'n8n-core';
import type {
	ICredentialType,
	ICredentialTypes,
	INodesAndCredentials,
	LoadedClass,
} from 'n8n-workflow';
import { RESPONSE_ERROR_MESSAGES } from './constants';

class CredentialTypesClass implements ICredentialTypes {
	constructor(private nodesAndCredentials: INodesAndCredentials) {}

	recognizes(type: string) {
		return type in this.knownCredentials || type in this.loadedCredentials;
	}

	getByName(credentialType: string): ICredentialType {
		return this.getCredential(credentialType).type;
	}

	getNodeTypesToTestWith(type: string): string[] {
		return this.knownCredentials[type]?.nodesToTestWith ?? [];
	}

	private getCredential(type: string): LoadedClass<ICredentialType> {
		const loadedCredentials = this.loadedCredentials;
		if (type in loadedCredentials) {
			return loadedCredentials[type];
		}

		const knownCredentials = this.knownCredentials;
		if (type in knownCredentials) {
			const { className, sourcePath } = knownCredentials[type];
			const loaded: ICredentialType = loadClassInIsolation(sourcePath, className);
			loadedCredentials[type] = { sourcePath, type: loaded };
			return loadedCredentials[type];
		}
		throw new Error(`${RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL}: ${type}`);
	}

	private get loadedCredentials() {
		return this.nodesAndCredentials.loaded.credentials;
	}

	private get knownCredentials() {
		return this.nodesAndCredentials.known.credentials;
	}
}

let credentialTypesInstance: CredentialTypesClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CredentialTypes(nodesAndCredentials?: INodesAndCredentials): CredentialTypesClass {
	if (!credentialTypesInstance) {
		if (nodesAndCredentials) {
			credentialTypesInstance = new CredentialTypesClass(nodesAndCredentials);
		} else {
			throw new Error('CredentialTypes not initialized yet');
		}
	}

	return credentialTypesInstance;
}
