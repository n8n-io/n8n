import { UnexpectedError } from 'n8n-workflow';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from '../constants';
import type { CredentialTypesPolicyKind } from '../credential-types.policy-kind';
import type { NodeTypesPolicyKind } from '../node-types.policy-kind';
import { PolicyKindRegistry } from '../policy-kind.registry';

describe('PolicyKindRegistry', () => {
	const nodeTypes = { id: NODE_TYPES_KIND } as unknown as NodeTypesPolicyKind;
	const credentialTypes = { id: CREDENTIAL_TYPES_KIND } as unknown as CredentialTypesPolicyKind;
	const registry = new PolicyKindRegistry(nodeTypes, credentialTypes);

	it('returns the node type policy kind by its id', () => {
		expect(registry.get(NODE_TYPES_KIND)).toBe(nodeTypes);
	});

	it('returns the credential type policy kind by its id', () => {
		expect(registry.get(CREDENTIAL_TYPES_KIND)).toBe(credentialTypes);
	});

	it('throws UnexpectedError for an unknown kind id', () => {
		expect(() => registry.get('unknown-kind')).toThrow(UnexpectedError);
		expect(() => registry.get('unknown-kind')).toThrow('Unknown policy kind: unknown-kind');
	});
});
