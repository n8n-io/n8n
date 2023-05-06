import { loadClassInIsolation } from 'n8n-core';
import type { ICredentialType, ICredentialTypes, LoadedClass } from 'n8n-workflow';
import { Service } from 'typedi';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import { LoadNodesAndCredentials } from './LoadNodesAndCredentials';

@Service()
export class CredentialTypes implements ICredentialTypes {
	constructor(private nodesAndCredentials: LoadNodesAndCredentials) {
		nodesAndCredentials.credentialTypes = this;
	}

	recognizes(type: string) {
		return type in this.knownCredentials || type in this.loadedCredentials;
	}

	getByName(credentialType: string): ICredentialType {
		return this.getCredential(credentialType).type;
	}

	getNodeTypesToTestWith(type: string): string[] {
		return this.knownCredentials[type]?.nodesToTestWith ?? [];
	}

	/**
	 * Returns all parent types of the given credential type
	 */
	getParentTypes(typeName: string): string[] {
		const credentialType = this.getByName(typeName);
		if (credentialType?.extends === undefined) return [];

		const types: string[] = [];
		credentialType.extends.forEach((type: string) => {
			types.push(type);
			types.push(...this.getParentTypes(type));
		});

		return types;
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
