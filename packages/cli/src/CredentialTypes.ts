import { loadClassInIsolation } from 'n8n-core';
import type {
	ICredentialType,
	ICredentialTypes,
	INodesAndCredentials,
	LoadedClass,
} from 'n8n-workflow';
import { RESPONSE_ERROR_MESSAGES } from './constants';
import type { ICredentialsTypeData } from './Interfaces';

class CredentialTypesClass implements ICredentialTypes {
	constructor(private nodesAndCredentials: INodesAndCredentials) {}

	getAll(): ICredentialType[] {
		return Object.values(this.loadedCredentials).map(({ type }) => type);
	}

	getByName(credentialType: string): ICredentialType {
		return this.getCredential(credentialType).type;
	}

	getAllCredentialsTypeData(): ICredentialsTypeData {
		return this.knownCredentials;
	}

	/**
	 * Returns the credentials data of the given type and its parent types it extends
	 */
	getCredentialsDataWithParents(type: string): ICredentialsTypeData {
		const credentialType = this.getByName(type);

		const credentialTypes = this.loadedCredentials;
		const credentialTypeData: ICredentialsTypeData = {};
		credentialTypeData[type] = {
			className: credentialTypes[type].type.constructor.name,
			sourcePath: credentialTypes[type].sourcePath,
		};

		if (credentialType === undefined || credentialType.extends === undefined) {
			return credentialTypeData;
		}

		for (const typeName of credentialType.extends) {
			if (credentialTypeData[typeName] !== undefined) {
				continue;
			}

			credentialTypeData[typeName] = {
				className: credentialTypes[typeName].type.constructor.name,
				sourcePath: credentialTypes[typeName].sourcePath,
			};
			Object.assign(credentialTypeData, this.getCredentialsDataWithParents(typeName));
		}

		return credentialTypeData;
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
