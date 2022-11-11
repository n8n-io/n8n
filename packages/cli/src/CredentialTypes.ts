import * as path from 'path';
import type {
	ICredentialType,
	ICredentialTypeData,
	ICredentialTypes,
	INodesAndCredentials,
} from 'n8n-workflow';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { loadClassInIsolation } from './CommunityNodes/helpers';
import type { ICredentialsTypeData } from './Interfaces';

class CredentialTypesClass implements ICredentialTypes {
	constructor(private nodesAndCredentials: INodesAndCredentials) {}

	getAll(): ICredentialType[] {
		return Object.values(this.nodesAndCredentials.credentialTypes).map(({ type }) => type);
	}

	getByName(credentialType: string): ICredentialType {
		return this.getCredential(credentialType).type;
	}

	// TODO: use the lazy-loading data to return this
	getAllCredentialsTypeData(): ICredentialsTypeData {
		const { credentialTypes } = this.nodesAndCredentials;
		// Get the data of all the credential types that they
		// can be loaded again in the subprocess
		const returnData: ICredentialsTypeData = {};
		for (const credentialTypeName of Object.keys(credentialTypes)) {
			const credentialType = this.getCredential(credentialTypeName);
			returnData[credentialTypeName] = {
				className: credentialType.type.constructor.name,
				sourcePath: credentialType.sourcePath,
			};
		}

		return returnData;
	}

	/**
	 * Returns the credentials data of the given type and its parent types it extends
	 */
	getCredentialsDataWithParents(type: string): ICredentialsTypeData {
		const { credentialTypes } = this.nodesAndCredentials;
		const credentialType = this.getByName(type);

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

	private getCredential(type: string): ICredentialTypeData[string] {
		return this.nodesAndCredentials.credentialTypes[type] ?? this.loadCredential(type);
	}

	private loadCredential(type: string): ICredentialTypeData[string] {
		const {
			known: { credentials: knownCredentials },
			credentialTypes,
		} = this.nodesAndCredentials;
		if (type in knownCredentials) {
			const sourcePath = knownCredentials[type];
			const [name] = path.parse(sourcePath).name.split('.');
			const loaded: ICredentialType = loadClassInIsolation(sourcePath, name);
			credentialTypes[type] = { sourcePath, type: loaded };
			return credentialTypes[type];
		}
		throw new Error(`${RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL}: ${type}`);
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
