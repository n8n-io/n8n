import type { ICredentialType, ICredentialTypes } from 'n8n-workflow';
import { Service } from 'typedi';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

@Service()
export class CredentialTypes implements ICredentialTypes {
	constructor(private loadNodesAndCredentials: LoadNodesAndCredentials) {}

	recognizes(type: string) {
		const { loadedCredentials, knownCredentials } = this.loadNodesAndCredentials;
		return type in knownCredentials || type in loadedCredentials;
	}

	getByName(credentialType: string): ICredentialType {
		return this.loadNodesAndCredentials.getCredential(credentialType).type;
	}

	getSupportedNodes(type: string): string[] {
		return this.loadNodesAndCredentials.knownCredentials[type]?.supportedNodes ?? [];
	}

	/**
	 * Returns all parent types of the given credential type
	 */
	getParentTypes(typeName: string): string[] {
		const extendsArr = this.loadNodesAndCredentials.knownCredentials[typeName]?.extends ?? [];
		if (extendsArr.length) {
			extendsArr.forEach((type) => {
				extendsArr.push(...this.getParentTypes(type));
			});
		}
		return extendsArr;
	}
}
