import { Service } from '@n8n/di';
import type { ICredentialType, ICredentialTypes } from 'n8n-workflow';

import { LoadNodesAndCredentials } from './load-nodes-and-credentials';

@Service()
export class CredentialTypes implements ICredentialTypes {
	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	recognizes(type: string): boolean {
		return this.loadNodesAndCredentials.recognizesCredential(type);
	}

	getByName(type: string): ICredentialType {
		return this.loadNodesAndCredentials.getCredential(type).type;
	}

	getSupportedNodes(type: string): string[] {
		return this.loadNodesAndCredentials.known.credentials[type]?.supportedNodes ?? [];
	}

	getParentTypes(type: string): string[] {
		const parentTypes = this.loadNodesAndCredentials.known.credentials[type]?.extends ?? [];
		const resolvedParentTypes = [...parentTypes];

		for (const parentType of resolvedParentTypes) {
			resolvedParentTypes.push(...this.getParentTypes(parentType));
		}

		return resolvedParentTypes;
	}
}
