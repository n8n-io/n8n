import type { CredentialTypeAvailability, NodeTypeAvailability } from '@n8n/api-types';
import {
	getCredentialOnlyNodeCredentialType,
	HTTP_REQUEST_NODE_TYPE,
	isCredentialOnlyNodeType,
} from 'n8n-workflow';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/** The verdict that restricts a node type: from the node kind, or the credential kind for a credential-only node. */
export type TypeRestriction = NodeTypeAvailability | CredentialTypeAvailability;

function nodeRestriction(nodeType: string): NodeTypeAvailability | null {
	const availability = useTypeAvailabilityPoliciesStore().getNodeTypeAvailability(nodeType);
	return availability && !availability.available ? availability : null;
}

export function getCredentialTypeRestriction(
	credentialType: string,
): CredentialTypeAvailability | null {
	const availability =
		useTypeAvailabilityPoliciesStore().getCredentialTypeAvailability(credentialType);
	return availability && !availability.available ? availability : null;
}

/**
 * A credential-only node (`n8n-creds-base.<type>`) is HTTP Request with one credential type
 * attached, so it is restricted when either is: the node kind decides for HTTP Request, the
 * credential kind for the type it wraps. HTTP Request is read first because it is the wider
 * reason and already covers every credential-only node. This mirrors the backend, where the
 * node check judges the stored `httpRequest` node and the credential check judges its type.
 */
export function getNodeTypeRestriction(nodeType: string): TypeRestriction | null {
	if (isCredentialOnlyNodeType(nodeType)) {
		return (
			nodeRestriction(HTTP_REQUEST_NODE_TYPE) ??
			getCredentialTypeRestriction(getCredentialOnlyNodeCredentialType(nodeType))
		);
	}

	return nodeRestriction(nodeType);
}

export function isNodeTypeRestricted(nodeType: string): boolean {
	return getNodeTypeRestriction(nodeType) !== null;
}

export function useNodeTypeRestriction(nodeType: MaybeRefOrGetter<string | null | undefined>) {
	const restriction = computed(() => {
		const type = toValue(nodeType);
		return type ? getNodeTypeRestriction(type) : null;
	});

	const isRestricted = computed(() => restriction.value !== null);
	const restrictionScope = computed(() => restriction.value?.scope);

	return { isRestricted, restrictionScope };
}
