import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialTypesPolicyKind } from './credential-types.policy-kind';
import { NodeTypesPolicyKind } from './node-types.policy-kind';
import type { PolicyKindDefinition } from './policy-kind';

@Service()
export class PolicyKindRegistry {
	private readonly byId: ReadonlyMap<string, PolicyKindDefinition>;

	constructor(nodeTypes: NodeTypesPolicyKind, credentialTypes: CredentialTypesPolicyKind) {
		this.byId = new Map([nodeTypes, credentialTypes].map((kind) => [kind.id, kind]));
	}

	/** Every caller passes a kind constant, so an unknown one is a bug, not bad input. */
	get(kind: string): PolicyKindDefinition {
		const definition = this.byId.get(kind);
		if (!definition) throw new UnexpectedError(`Unknown policy kind: ${kind}`);
		return definition;
	}
}
